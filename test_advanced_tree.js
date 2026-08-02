const crypto = require('crypto');

function scoreHeading(text, fontSize, y, isLargestOnPage, pageText) {
  let score = 0;
  const cleanText = text.trim();
  
  // Rule 2: Unit Detection
  if (/^UNIT\s+[A-Za-z0-9]+$/i.test(cleanText) || /^UNIT\s+[A-Za-z0-9]+[:\-.]?\s+.+/i.test(cleanText)) {
     score += 60;
  }
  
  // Rule 3: Chapter Detection
  if (/^(Chapter|Part)\s+\d+/i.test(cleanText)) {
     score += 50;
  }
  
  // Rule 5: Concept Detection
  if (/^(Concept|Section)\s+\d+\.\d+/i.test(cleanText)) {
     score += 50;
  }
  
  // Front / Back matter
  if (/^(Preface|Foreword|Introduction|About the Authors?|Acknowledgements|Contents|Table of Contents|Appendix|Glossary|Credits|References|Bibliography|Index|Answer Key|Solutions)/i.test(cleanText)) {
     score += 40;
  }
  
  // Positive typography
  if (isLargestOnPage) score += 20;
  if (cleanText.length < 50) score += 15;
  
  // Negative signals (paragraphs or references)
  if (cleanText.endsWith(".")) score -= 30;
  if (/\b(explains|describes|provides|introduces|discusses|shows|demonstrates|illustrates|see|in)\b/i.test(cleanText)) score -= 40;
  if (cleanText.length > 100) score -= 40; // Probably a paragraph
  
  // Rule 4: Ignore Key Concepts previews
  // If the page has a literal "Key Concepts" header before this, and this is just a list.
  if (/(^|\n)Key Concepts\s*\n/i.test(pageText) && /^1\.\d+/.test(cleanText)) {
     score -= 50; // It's a preview list, ignore it as a heading
  }
  
  return score;
}

// Tree builder logic
function buildAdvancedTree(extractedChapters) {
    let finalChapters = [];
    
    let frontMatterId = crypto.randomUUID();
    let hasFrontMatter = false;
    
    let backMatterId = crypto.randomUUID();
    let hasBackMatter = false;
    
    let currentUnitId = null;
    let currentChapterId = null;
    
    let mainContentStarted = false;
    let backMatterStarted = false;
    
    let orderIdx = 0;
    
    for (const ch of extractedChapters) {
       const isFrontType = /^(preface|foreword|acknowledgements|about the authors?|copyright|table of contents|dedication|how to use this book|introduction)/i.test(ch.title);
       const isBackType = /^(appendix|glossary|credits|references|bibliography|index|solutions|answers|answer key)/i.test(ch.title);
       const isUnit = /^unit\s+[a-z0-9]+/i.test(ch.title);
       const isChapter = /^(chapter|part)\s+\d+/i.test(ch.title);
       const isSection = /^(concept|section)\s+\d+\.\d+/i.test(ch.title);
       
       if (isUnit || isChapter || isSection) {
          mainContentStarted = true;
       }
       
       if (mainContentStarted && isBackType) {
          backMatterStarted = true;
       }
       
       if (!mainContentStarted && !backMatterStarted && isFrontType) {
          if (!hasFrontMatter) {
             finalChapters.push({ id: frontMatterId, title: "Front Matter", page_number: ch.page_number, level: 0, parent_id: null, type: 'frontMatter', order_index: orderIdx++ });
             hasFrontMatter = true;
          }
          ch.parent_id = frontMatterId;
          ch.level = 1;
          ch.type = 'frontMatter';
          ch.order_index = orderIdx++;
          finalChapters.push(ch);
       } 
       else if (backMatterStarted || (mainContentStarted && isBackType)) {
          if (!hasBackMatter) {
             finalChapters.push({ id: backMatterId, title: "Back Matter", page_number: ch.page_number, level: 0, parent_id: null, type: 'backMatter', order_index: orderIdx++ });
             hasBackMatter = true;
          }
          ch.parent_id = backMatterId;
          ch.level = 1;
          ch.type = 'backMatter';
          ch.order_index = orderIdx++;
          finalChapters.push(ch);
       }
       else if (isUnit) {
          ch.parent_id = null;
          ch.level = 0;
          ch.type = 'unit';
          ch.order_index = orderIdx++;
          currentUnitId = ch.id;
          currentChapterId = null; // Reset chapter when a new unit starts
          finalChapters.push(ch);
       }
       else if (isChapter) {
          ch.parent_id = currentUnitId || null;
          ch.level = currentUnitId ? 1 : 0;
          ch.type = 'chapter';
          ch.order_index = orderIdx++;
          currentChapterId = ch.id;
          finalChapters.push(ch);
       }
       else if (isSection && currentChapterId) {
          ch.parent_id = currentChapterId;
          ch.level = currentUnitId ? 2 : 1;
          ch.type = 'concept';
          ch.order_index = orderIdx++;
          finalChapters.push(ch);
       }
       else {
          // Fallback node mapping
          if (!ch.parent_id) {
             if (currentChapterId) {
                ch.parent_id = currentChapterId;
                ch.level = currentUnitId ? 2 : 1;
             } else if (currentUnitId) {
                ch.parent_id = currentUnitId;
                ch.level = 1;
             } else {
                ch.parent_id = null;
                ch.level = 0;
             }
          }
          ch.type = ch.type || 'chapter';
          ch.order_index = orderIdx++;
          finalChapters.push(ch);
       }
    }
    
    return finalChapters;
}

const testCandidates = [
   { id: "1", title: "Preface", page_number: 1 },
   { id: "2", title: "UNIT ONE The Chemistry of Life", page_number: 10 },
   { id: "3", title: "Chapter 1 Intro", page_number: 12 },
   { id: "4", title: "Concept 1.1", page_number: 14 },
   { id: "5", title: "Concept 1.2", page_number: 16 },
   { id: "6", title: "Chapter 2 Atoms", page_number: 20 },
   { id: "7", title: "UNIT TWO The Cell", page_number: 30 },
   { id: "8", title: "Chapter 3 Cells", page_number: 32 },
   { id: "9", title: "Glossary", page_number: 50 },
];

const tree = buildAdvancedTree(testCandidates);
tree.forEach(n => console.log(`${'  '.repeat(n.level)}${n.title} (parent: ${n.parent_id}, type: ${n.type})`));
