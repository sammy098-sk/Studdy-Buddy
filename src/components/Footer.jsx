import React, { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

const Facebook = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const XIcon = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const Instagram = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const YouTube = ({ size = 19 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
  </svg>
);

export default function Footer({ onNavigate }) {
  // Mobile accordion state (null by default so all sections start collapsed)
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleNav = (target) => {
    if (!onNavigate) return;
    if (target === 'home') {
      onNavigate('study');
    } else {
      onNavigate(target);
    }
  };

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-10 px-6 sm:px-8 mt-16">
      <div className="max-w-6xl mx-auto flex flex-col md:grid md:grid-cols-4 gap-6 md:gap-8 text-center md:text-left">
        
        {/* Brand & Subtitle Column */}
        <div className="flex flex-col items-center md:items-start space-y-3 pb-4 md:pb-0 border-b border-slate-100 md:border-none">
          <button 
            onClick={() => handleNav('study')} 
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="StudyBuddy Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[#2954E5] flex items-center justify-center text-white shadow-2xs">
              <BookOpen size={16} strokeWidth={2} />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Study Buddy
            </span>
          </button>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs leading-relaxed font-medium">
            Making learning simpler for every student.
          </p>
        </div>

        {/* Accordion Container on Mobile, Standard Columns on Desktop */}
        <div className="md:contents divide-y divide-slate-100 md:divide-y-0 text-left">
          
          {/* Group 1: Quick Links */}
          <div className="py-2 md:py-0">
            <button
              onClick={() => toggleSection('browse')}
              className="w-full flex items-center justify-between py-2 md:py-0 text-xs font-extrabold text-slate-900 uppercase tracking-wider md:pointer-events-none md:mb-3.5"
            >
              <span>Quick Links</span>
              <ChevronDown 
                size={16} 
                strokeWidth={2.5}
                className={`md:hidden text-slate-400 transition-transform duration-200 ${expandedSection === 'browse' ? 'rotate-180 text-[#2954E5]' : ''}`} 
              />
            </button>
            
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden md:max-h-none md:opacity-100 md:overflow-visible md:block ${
                expandedSection === 'browse' ? 'max-h-48 opacity-100 pb-3 pt-2' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600 font-medium">
                <button onClick={() => handleNav('study')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Subjects</button>
                <button onClick={() => handleNav('library')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Library</button>
                <button onClick={() => handleNav('study')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Continue Reading</button>
                <button onClick={() => handleNav('library')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Recently Added</button>
              </div>
            </div>
          </div>

          {/* Group 2: Resources */}
          <div className="py-2 md:py-0">
            <button
              onClick={() => toggleSection('support')}
              className="w-full flex items-center justify-between py-2 md:py-0 text-xs font-extrabold text-slate-900 uppercase tracking-wider md:pointer-events-none md:mb-3.5"
            >
              <span>Resources</span>
              <ChevronDown 
                size={16} 
                strokeWidth={2.5}
                className={`md:hidden text-slate-400 transition-transform duration-200 ${expandedSection === 'support' ? 'rotate-180 text-[#2954E5]' : ''}`} 
              />
            </button>
            
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden md:max-h-none md:opacity-100 md:overflow-visible md:block ${
                expandedSection === 'support' ? 'max-h-60 opacity-100 pb-3 pt-2' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600 font-medium">
                <button onClick={() => handleNav('about')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">About</button>
                <button onClick={() => handleNav('help')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Help Center</button>
                <button onClick={() => handleNav('privacy')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Privacy Policy</button>
                <button onClick={() => handleNav('terms')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Terms of Service</button>
                <button onClick={() => handleNav('contact')} className="text-left hover:text-[#2954E5] transition-colors py-0.5">Contact</button>
              </div>
            </div>
          </div>

          {/* Group 3: Connect (Social) */}
          <div className="py-2 md:py-0">
            <button
              onClick={() => toggleSection('connect')}
              className="w-full flex items-center justify-between py-2 md:py-0 text-xs font-extrabold text-slate-900 uppercase tracking-wider md:pointer-events-none md:mb-3.5"
            >
              <span>Connect</span>
              <ChevronDown 
                size={16} 
                strokeWidth={2.5}
                className={`md:hidden text-slate-400 transition-transform duration-200 ${expandedSection === 'connect' ? 'rotate-180 text-[#2954E5]' : ''}`} 
              />
            </button>
            
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden md:max-h-none md:opacity-100 md:overflow-visible md:block ${
                expandedSection === 'connect' ? 'max-h-36 opacity-100 pb-3 pt-3' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="flex items-center justify-center md:justify-start gap-3.5">
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  aria-label="Facebook" 
                  className="w-10 h-10 rounded-full bg-[#2954E5] hover:bg-blue-700 text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
                >
                  <Facebook size={18} />
                </a>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  aria-label="X" 
                  className="w-10 h-10 rounded-full bg-[#2954E5] hover:bg-blue-700 text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
                >
                  <XIcon size={16} />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  aria-label="Instagram" 
                  className="w-10 h-10 rounded-full bg-[#2954E5] hover:bg-blue-700 text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
                >
                  <Instagram size={18} />
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  aria-label="YouTube" 
                  className="w-10 h-10 rounded-full bg-[#2954E5] hover:bg-blue-700 text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
                >
                  <YouTube size={19} />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Copyright Divider */}
      <div className="max-w-6xl mx-auto mt-8 sm:mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
        © 2026 Study Buddy. All rights reserved.
      </div>
    </footer>
  );
}
