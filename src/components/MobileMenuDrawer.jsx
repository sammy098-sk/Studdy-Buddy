import React from 'react';
import { Home, User, Bell, X, BookOpen, History, Upload, LogOut } from 'lucide-react';
import { isAdminUser } from '../config';

export default function MobileMenuDrawer({ onClose, onNavigate, currentPage, user, onLogout }) {
  const items = [
    { key: "study", label: "Home", icon: Home },
    { key: "library", label: "Library", icon: BookOpen },
    { key: "sessions", label: "History", icon: History },
    { key: "profile", label: "My Account", icon: User },
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

  const userName = user?.name || user?.email?.split('@')[0] || "Student";
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";
  const avatarUrl = user?.avatar_url || user?.photo_url || user?.avatar || null;

  return (
    <div className="md:hidden fixed inset-0 z-[100] flex justify-end">
      <div className="flex-1 bg-black/35 backdrop-blur-xs transition-opacity duration-200" onClick={onClose} />
      <div className="relative z-10 w-72 h-full bg-white px-5 py-6 flex flex-col overflow-y-auto shadow-2xl" style={{ borderLeft: "1px solid #E3EAFB" }}>
          {/* Logo at the top of the drawer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-xs" style={{ background: "#2954E5" }}>
                <BookOpen size={15} color="#FFFFFF" />
              </div>
              <span className="font-extrabold text-[16px] tracking-tight" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
                StudyBuddy
              </span>
            </div>
            <button onClick={onClose} aria-label="Close menu" className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={20} style={{ color: "#101C34" }} />
            </button>
          </div>

        <div className="flex flex-col gap-1.5 mb-6">
          {items.map(({ key, label, icon: Icon }) => {
            const active = currentPage === key;
            
            if (key === 'profile') {
              return (
                <button
                  key={key}
                  onClick={() => onNavigate('profile')}
                  className="flex items-center justify-between p-3 my-1.5 rounded-2xl text-left border transition-all duration-200 group cursor-pointer active:scale-[0.98]"
                  style={{
                    background: active ? "#E8F1FE" : "#F8FAFF",
                    borderColor: active ? "#2954E5" : "#E3EAFB",
                    boxShadow: active ? "0 4px 12px rgba(41, 84, 229, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)"
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Circular Avatar with Active Dot */}
                    <div className="relative shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={userName} className="w-10 h-10 rounded-full object-cover border border-blue-200 shadow-2xs" />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-xs"
                          style={{ background: "linear-gradient(135deg, #2954E5, #4f46e5)" }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" title="Online" />
                    </div>

                    <div className="min-w-0 flex flex-col">
                      <div className="text-[14.5px] font-extrabold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        {userName}
                      </div>
                      <div className="text-[11.5px] font-bold text-blue-600 flex items-center gap-1 mt-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>View Account</span>
                        <span className="font-black">→</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className="flex items-center gap-3.5 pl-3.5 pr-3 py-2.5 rounded-xl text-sm font-extrabold text-left relative hover:bg-slate-50 transition-all cursor-pointer"
                style={{ color: active ? "#2954E5" : "#101C34", background: active ? "#E8F1FE" : "transparent" }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full" style={{ background: "#2954E5" }} />
                )}
                <Icon size={19} className="shrink-0 transition-transform group-hover:scale-105" style={{ color: active ? "#2954E5" : "#5A6B8C" }} /> 
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-4 flex flex-col gap-1">
          {secondaryItems.map(({ key, label }) => {
            const active = currentPage === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className="flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-xl text-xs font-bold text-left relative hover:bg-slate-50/80 transition-colors cursor-pointer"
                style={{ color: active ? "#2954E5" : "#8493B0", background: active ? "#E8F1FE" : "transparent" }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full" style={{ background: "#2954E5" }} />
                )}
                {label}
              </button>
            );
          })}

          {/* Divider and Log Out Action at Very Bottom */}
          <div className="pt-3.5 mt-3 border-t border-slate-200/80">
            <button
              onClick={() => {
                if (onClose) onClose();
                if (onLogout) onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-extrabold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors text-left group cursor-pointer border border-transparent hover:border-rose-200/60 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100/70 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors shadow-2xs shrink-0">
                <LogOut size={16} strokeWidth={2.5} />
              </div>
              <span>Log Out</span>
            </button>
          </div>

          <p className="text-[11px] mt-3 font-bold px-2 text-center" style={{ color: "#A0AEC0" }}>© 2026 StudyBuddy — built for JAMB candidates.</p>
        </div>
      </div>
    </div>
  );
}
