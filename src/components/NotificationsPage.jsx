import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import Footer from './Footer';
import BackToHomeButton from './BackToHomeButton';

export default function NotificationsPage({ onNavigate }) {
  const [prefs, setPrefs] = useState({
    daily: true,
    newTopics: true,
    weeklyProgress: false,
    questionOfDay: false,
  });
  const [toast, setToast] = useState(null);

  const items = [
    { key: "daily", label: "Daily study reminder", desc: "A nudge to keep your study streak going." },
    { key: "newTopics", label: "New topic suggestions", desc: "When fresh JAMB topics are added." },
    { key: "weeklyProgress", label: "Weekly progress summary", desc: "A recap of what you've studied." },
    { key: "questionOfDay", label: "Past question of the day", desc: "One question a day to keep you sharp." },
  ];

  const toggle = (key, label) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      setToast(`${label} turned ${next[key] ? "on" : "off"}`);
      return next;
    });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col relative w-full" style={{ background: "#FAFBFF" }}>
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-xl mx-auto">
          <BackToHomeButton onNavigate={onNavigate} />
          <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
            Notifications
          </h2>
          <p className="text-sm mb-6" style={{ color: "#8493B0" }}>Choose what StudyBuddy can notify you about.</p>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#D8E3F8" }}>
            {items.map(({ key, label, desc }, i) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-5 py-4"
                style={{ background: "#FFFFFF", borderBottom: i < items.length - 1 ? "1px solid #E3EAFB" : "none" }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium" style={{ color: "#101C34" }}>{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#8493B0" }}>{desc}</div>
                </div>
                <ToggleSwitch checked={prefs[key]} onChange={() => toggle(key, label)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2" style={{ background: "#101C34" }}>
          <Bell size={14} /> {toast}
        </div>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
