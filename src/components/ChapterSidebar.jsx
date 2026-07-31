import React, { useEffect, useRef, useMemo, useState } from 'react';
import { X, Book, ChevronRight, ChevronDown } from 'lucide-react';

const TreeNode = ({ node, level, expandedNodes, toggleExpand, onNavigate, activeRef, activeChapterId, activePath }) => {
   const hasChildren = node.children && node.children.length > 0;
   const isExpanded = expandedNodes.has(node.id);
   const isNodeActive = node.id === activeChapterId;
   const isInActivePath = activePath && activePath.has(node.id);
   
   let btnClass = 'hover:bg-slate-200 text-slate-700';
   if (isNodeActive) {
      btnClass = 'bg-blue-100 text-blue-700 font-semibold';
   } else if (isInActivePath) {
      btnClass = 'bg-slate-100 text-blue-600 font-medium';
   }
   
   return (
     <div className="flex flex-col w-full">
        <div className="flex items-center w-full my-0.5" style={{ paddingLeft: `${0.5 + level * 1}rem` }}>
           {hasChildren ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }} 
                className="p-1 shrink-0 text-slate-400 hover:text-slate-700"
              >
                 {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
           ) : (
              <div style={{ width: '22px' }} className="shrink-0" />
           )}
           <button 
             ref={isNodeActive ? activeRef : null}
             onClick={() => onNavigate(node)}
             className={`flex-1 text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${btnClass}`}
             style={{ lineHeight: '1.3' }}
           >
             {node.title}
           </button>
        </div>
        {hasChildren && isExpanded && (
           <div className="flex flex-col w-full">
              {node.children.map(child => (
                 <TreeNode 
                   key={child.id} 
                   node={child} 
                   level={level + 1} 
                   expandedNodes={expandedNodes} 
                   toggleExpand={toggleExpand} 
                   onNavigate={onNavigate} 
                   activeRef={activeRef} 
                   activeChapterId={activeChapterId}
                   activePath={activePath}
                 />
              ))}
           </div>
        )}
     </div>
   );
};

export default function ChapterSidebar({ chapters = [], isOpen, onClose, currentPage, onPageChange }) {
  const activeRef = useRef(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // 1. Reconstruct the tree from the flat array
  const tree = useMemo(() => {
     const map = {};
     const roots = [];
     chapters.forEach(ch => {
        map[ch.id] = { ...ch, children: [] };
     });
     
     chapters.forEach(ch => {
        if (ch.parent_id && map[ch.parent_id]) {
           map[ch.parent_id].children.push(map[ch.id]);
        } else {
           roots.push(map[ch.id]);
        }
     });
     return roots;
  }, [chapters]);

  // 2. Find active chapter by finding the last chapter whose page_number <= currentPage
  const activeChapterId = useMemo(() => {
     let activeId = null;
     // Array is assumed to be sorted by order_index (and logically by page_number)
     // We can just iterate backwards.
     for (let i = chapters.length - 1; i >= 0; i--) {
        if (currentPage >= chapters[i].page_number) {
           activeId = chapters[i].id;
           break;
        }
     }
     return activeId;
  }, [chapters, currentPage]);

  // 3. Compute active path (active node + all ancestors)
  const activePath = useMemo(() => {
     const path = new Set();
     let currentId = activeChapterId;
     while (currentId) {
        path.add(currentId);
        const node = chapters.find(c => c.id === currentId);
        if (!node) break;
        currentId = node.parent_id;
     }
     return path;
  }, [activeChapterId, chapters]);

  // 4. Auto-expand parents of the active chapter
  useEffect(() => {
     if (activeChapterId) {
        setExpandedNodes(prev => {
           const next = new Set(prev);
           let currentId = activeChapterId;
           let changed = false;
           
           const activeNode = chapters.find(c => c.id === currentId);
           if (activeNode) {
              const childrenCount = chapters.filter(c => c.parent_id === activeNode.id).length;
              if (childrenCount > 0 && !next.has(activeNode.id)) {
                 next.add(activeNode.id);
                 changed = true;
              }
           }

           while (currentId) {
              const node = chapters.find(c => c.id === currentId);
              if (!node) break;
              if (node.parent_id && !next.has(node.parent_id)) {
                 next.add(node.parent_id);
                 changed = true;
              }
              currentId = node.parent_id;
           }
           
           return changed ? next : prev;
        });
     }
  }, [activeChapterId, chapters]);

  // 5. Auto-scroll to active node
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeChapterId]);

  const toggleExpand = (id) => {
     setExpandedNodes(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
           next.delete(id);
        } else {
           next.add(id);
        }
        return next;
     });
  };

  const handleNavigate = (node) => {
     onPageChange(node.page_number);
     // Ensure it expands when clicked
     setExpandedNodes(prev => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
     });
     if (window.innerWidth < 768) {
        onClose();
     }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 left-0 w-64 bg-slate-50 border-r flex flex-col z-20 shadow-xl md:shadow-none md:relative transition-all" style={{ borderColor: '#E2E8F0' }}>
       <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#E2E8F0' }}>
         <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
           <Book size={16} className="text-blue-600" />
           Table of Contents
         </h2>
         <button onClick={onClose} className="md:hidden p-1 hover:bg-slate-200 rounded text-slate-600">
           <X size={16} />
         </button>
       </div>
       <div className="flex-1 overflow-y-auto p-2">
         {tree.length === 0 ? (
           <div className="text-center text-sm text-slate-500 mt-10 px-4">
              No Chapters Available.
           </div>
         ) : (
           <div className="flex flex-col pb-4">
             {tree.map(rootNode => (
                <TreeNode 
                   key={rootNode.id} 
                   node={rootNode} 
                   level={0} 
                   expandedNodes={expandedNodes} 
                   toggleExpand={toggleExpand}
                   onNavigate={handleNavigate}
                   activeRef={activeRef}
                   activeChapterId={activeChapterId}
                   activePath={activePath}
                />
             ))}
           </div>
         )}
       </div>
    </div>
  );
}
