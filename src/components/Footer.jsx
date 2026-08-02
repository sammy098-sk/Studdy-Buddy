import React from 'react';
import { BookOpen } from 'lucide-react';

export default function Footer({ onNavigate }) {
  const handleNav = (target) => {
    if (!onNavigate) return;
    if (target === 'home') {
      onNavigate('study');
    } else if (target === 'search') {
      onNavigate('study');
      setTimeout(() => {
        const input = document.querySelector('input[placeholder*="Search textbooks"]');
        if (input) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
        }
      }, 150);
    } else {
      onNavigate(target);
    }
  };

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 px-6 sm:px-8 mt-16">
      <div className="max-w-6xl mx-auto flex flex-col md:grid md:grid-cols-4 gap-10 md:gap-8 text-center md:text-left">
        
        {/* Column 1: Brand & Subtitle */}
        <div className="flex flex-col items-center md:items-start space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-2xs">
              <BookOpen size={16} strokeWidth={2} />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight font-sans">
              Study Buddy
            </span>
          </div>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Making learning simpler for every student.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div className="flex flex-col items-center md:items-start space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Quick Links
          </h4>
          <div className="flex flex-col space-y-2.5 text-sm text-slate-600 font-medium">
            <button onClick={() => handleNav('home')} className="hover:text-blue-600 transition-colors">Home</button>
            <button onClick={() => handleNav('library')} className="hover:text-blue-600 transition-colors">Library</button>
            <button onClick={() => handleNav('search')} className="hover:text-blue-600 transition-colors">Search</button>
            <button onClick={() => handleNav('profile')} className="hover:text-blue-600 transition-colors">Profile</button>
          </div>
        </div>

        {/* Column 3: Resources */}
        <div className="flex flex-col items-center md:items-start space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Resources
          </h4>
          <div className="flex flex-col space-y-2.5 text-sm text-slate-600 font-medium">
            <button onClick={() => handleNav('about')} className="hover:text-blue-600 transition-colors">About</button>
            <button onClick={() => handleNav('privacy')} className="hover:text-blue-600 transition-colors">Privacy Policy</button>
            <button onClick={() => handleNav('terms')} className="hover:text-blue-600 transition-colors">Terms</button>
            <button onClick={() => handleNav('contact')} className="hover:text-blue-600 transition-colors">Contact</button>
          </div>
        </div>

        {/* Column 4: Social */}
        <div className="flex flex-col items-center md:items-start space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Social
          </h4>
          <div className="flex flex-col space-y-2.5 text-sm text-slate-600 font-medium">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">Facebook</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">X</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">Instagram</a>
          </div>
        </div>

      </div>

      {/* Bottom Line Copyright */}
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
        © 2026 Study Buddy. All rights reserved.
      </div>
    </footer>
  );
}
