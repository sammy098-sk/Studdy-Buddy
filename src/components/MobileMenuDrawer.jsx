import React from 'react';
import { Home, User, Bell, X, BookOpen, History, Upload } from 'lucide-react';
import { isAdminUser } from '../config';

export default function MobileMenuDrawer({ onClose, onNavigate, currentPage, user }) {
  const items = [
    { key: "study", label: "Home", icon: Home },
    { key: "sessions", label: "History", icon: History },
    { key: "profile", label: "Profile", icon: User },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];

  if (isAdminUser(user)) {
    items.push({ key: "importer", label: "Admin: PDF Importer", icon: Upload });
  }

  const secondaryItems = [
    { key: "about", label: "About" },
    { key: "how-it-works", label: "How it works" },
    { key: "contact", label: "Contact" },
    { key: "privacy", label: "Privacy Policy" },
    { key: "terms", label: "Terms" },
  ];

  return (
    <div className="md:hidden fixed inset-0 z-30 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-72 h-full bg-white px-5 py-6 flex flex-col overflow-y-auto" style={{ borderLeft: "1px solid #E3EAFB" }}>
          {/* Logo at the top of the drawer */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#2954E5" }}>
                <BookOpen size={15} color="#FFFFFF" />
              </div>
              <span className="font-semibold text-[15px]" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
                StudyBuddy
              </span>
            </div>
            <button onClick={onClose} aria-label="Close menu">
              <X size={20} style={{ color: "#101C34" }} />
            </button>
          </div>

        <div className="flex flex-col gap-1 mb-8">
          {items.map(({ key, label, icon: Icon }) => {
            const active = currentPage === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className="flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm font-medium text-left relative"
                style={{ color: active ? "#2954E5" : "#101C34", background: active ? "#E8F1FE" : "transparent" }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full" style={{ background: "#2954E5" }} />
                )}
                <Icon size={17} style={{ color: "#2954E5" }} /> {label}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6 flex flex-col gap-1">
          {secondaryItems.map(({ key, label }) => {
            const active = currentPage === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className="flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg text-xs font-medium text-left relative"
                style={{ color: active ? "#2954E5" : "#8493B0", background: active ? "#E8F1FE" : "transparent" }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full" style={{ background: "#2954E5" }} />
                )}
                {label}
              </button>
            );
          })}
          <p className="text-[11px] mt-4" style={{ color: "#B7C3DA" }}>© 2026 StudyBuddy — built for JAMB candidates.</p>
        </div>
      </div>
    </div>
  );
}
