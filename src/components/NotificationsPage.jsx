import React, { useState, useEffect } from 'react';
import { Bell, Loader2, AlertCircle } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import Footer from './Footer';
import BackToHomeButton from './BackToHomeButton';
import useNotificationPreferences from '../hooks/useNotificationPreferences';

export default function NotificationsPage({ user, onNavigate }) {
  const { preferences, loading, error, togglePreference } = useNotificationPreferences(user?.id);
  const [toast, setToast] = useState(null); // { message, isError }

  const items = [
    { key: "daily", label: "Daily study reminder", desc: "A nudge to keep your study streak going." },
    { key: "newTopics", label: "New topic suggestions", desc: "When fresh JAMB topics are added." },
    { key: "weeklyProgress", label: "Weekly progress summary", desc: "A recap of what you've studied." },
    { key: "questionOfDay", label: "Past question of the day", desc: "One question a day to keep you sharp." },
  ];

  const handleToast = (message, isError = false) => {
    setToast({ message, isError });
  };

  const handleToggle = (key, label) => {
    if (loading || !preferences) return;
    togglePreference(key, label, handleToast);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col relative w-full" style={{ background: "#edf5f1" }}>
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-xl mx-auto">
          <BackToHomeButton onNavigate={onNavigate} />
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-semibold" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
              Notifications
            </h2>
            {loading && (
              <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shadow-2xs">
                <Loader2 size={13} className="animate-spin text-blue-600" />
                <span>Loading preferences...</span>
              </span>
            )}
          </div>
          <p className="text-sm mb-6" style={{ color: "#8493B0" }}>Choose what StudyBuddy can notify you about.</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Note on Cloud Persistence</strong>
                {error.includes("does not exist") || error.includes("relation") ? 
                  "The database table for saving notification preferences has not been created yet in Supabase. Run notification_preferences_schema.sql to enable cloud persistence." : 
                  `Using offline fallbacks. (${error})`}
              </div>
            </div>
          )}

          <div className="rounded-2xl border overflow-hidden shadow-2xs transition-all" style={{ borderColor: "#D8E3F8" }}>
            {items.map(({ key, label, desc }, i) => {
              // Avoid briefly rendering incorrect defaults while loading; default to false/disabled
              const isChecked = preferences ? Boolean(preferences[key]) : false;
              const isDisabled = loading || !preferences;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors ${
                    isDisabled ? "opacity-60 bg-slate-50/50 pointer-events-none" : "hover:bg-blue-50/20"
                  }`}
                  style={{ background: isDisabled ? "#F8FAFC" : "#FFFFFF", borderBottom: i < items.length - 1 ? "1px solid #E3EAFB" : "none" }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2" style={{ color: "#101C34" }}>
                      <span>{label}</span>
                      {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#8493B0" }}>{desc}</div>
                  </div>
                  <ToggleSwitch 
                    checked={isChecked} 
                    disabled={isDisabled}
                    onChange={() => handleToggle(key, label)} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div 
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 transition-all ${
            toast.isError ? "bg-red-600 border border-red-500 shadow-red-500/20" : "bg-[#101C34]"
          }`}
        >
          {toast.isError ? <AlertCircle size={16} className="shrink-0 text-white" /> : <Bell size={14} className="shrink-0 text-blue-400" />} 
          <span>{toast.message}</span>
        </div>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
