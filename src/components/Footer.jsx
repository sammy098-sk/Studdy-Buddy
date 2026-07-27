import React from 'react';
import { BookOpen, MessageCircle, Mail } from 'lucide-react';

const Facebook = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Twitter = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Instagram = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Linkedin = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Footer({ onNavigate }) {
  const socialIcons = [Facebook, Twitter, Instagram, Linkedin];

  return (
    <footer className="px-6 sm:px-8 lg:px-16 py-10" style={{ background: "#FFFFFF" }}>
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-8">
        {/* Brand + contact */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#2954E5" }}>
              <BookOpen size={14} color="#FFFFFF" />
            </div>
            <span className="font-semibold text-[15px]" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
              StudyBuddy
            </span>
          </div>

          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#E8F1FE" }}>
              <MessageCircle size={14} style={{ color: "#2954E5" }} />
            </div>
            <div>
              <div className="text-[11px]" style={{ color: "#8493B0" }}>WhatsApp</div>
              <div className="text-xs font-medium" style={{ color: "#101C34" }}>+234 800 000 0000</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#E8F1FE" }}>
              <Mail size={14} style={{ color: "#2954E5" }} />
            </div>
            <div>
              <div className="text-[11px]" style={{ color: "#8493B0" }}>Email</div>
              <div className="text-xs font-medium" style={{ color: "#101C34" }}>hello@studybuddy.example</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#101C34" }}>Company</h4>
          <div className="flex flex-col gap-2 items-start text-sm" style={{ color: "#8493B0" }}>
            <button onClick={() => onNavigate("about")} className="hover:underline text-left">About</button>
            <button onClick={() => onNavigate("contact")} className="hover:underline text-left">Contact</button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#101C34" }}>Study</h4>
          <div className="flex flex-col gap-2 items-start text-sm" style={{ color: "#8493B0" }}>
            <button onClick={() => onNavigate("study")} className="hover:underline text-left">Subjects</button>
            <button onClick={() => onNavigate("how-it-works")} className="hover:underline text-left">How it works</button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#101C34" }}>Legal</h4>
          <div className="flex flex-col gap-2 items-start text-sm" style={{ color: "#8493B0" }}>
            <button onClick={() => onNavigate("privacy")} className="hover:underline text-left">Privacy Policy</button>
            <button onClick={() => onNavigate("terms")} className="hover:underline text-left">Terms</button>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#101C34" }}>Connect with us</h4>
          <div className="flex items-center gap-2">
            {socialIcons.map((Icon, i) => (
              <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#2954E5" }}>
                <Icon size={14} color="#FFFFFF" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "#8493B0" }}>
          <button onClick={() => onNavigate("privacy")} className="hover:underline">Privacy Policy</button>
          <button onClick={() => onNavigate("terms")} className="hover:underline">Terms of Use</button>
          <button onClick={() => onNavigate("contact")} className="hover:underline">Contact</button>
        </div>
        <div className="text-xs" style={{ color: "#B7C3DA" }}>© 2026 StudyBuddy. Built for JAMB candidates.</div>
      </div>
    </footer>
  );
}
