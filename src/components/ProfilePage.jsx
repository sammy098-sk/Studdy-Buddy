import React, { useState, useEffect } from 'react';
import { ChevronRight, LogOut, Activity, CheckCircle2, Home, Upload } from 'lucide-react';
import { SUBJECTS, isAdminUser } from '../config';
import Footer from './Footer';
import { supabase } from '../supabase';
import BackToHomeButton from './BackToHomeButton';

export default function ProfilePage({ user, onLogout, onNavigate, onUpdateUser }) {
  const initials = ((user.name || "S").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("") || "S").toUpperCase();
  const [expanded, setExpanded] = useState(null); // 'edit' | 'password' | 'preferences' | null
  const toggleSection = (key) => setExpanded((cur) => (cur === key ? null : key));

  // Weekly Progress Tracker
  const [weeklyProgress, setWeeklyProgress] = useState([false, false, false, false, false, false, false]);
  
  useEffect(() => {
    const fetchWeeklyProgress = async () => {
      // Find the start of the current week (Monday)
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const startOfWeek = new Date(now.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('study_progress')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString());

      let progress = [false, false, false, false, false, false, false];
      
      if (data) {
        data.forEach(record => {
          const recordDate = new Date(record.created_at);
          const d = recordDate.getDay(); // 0 = Sunday, 1 = Monday
          const index = d === 0 ? 6 : d - 1;
          progress[index] = true;
        });
      }
      
      setWeeklyProgress(progress);
    };

    if (user?.id) {
      fetchWeeklyProgress();
    }
  }, [user]);

  // Edit profile
  const [editName, setEditName] = useState(user.name);
  const [editSaved, setEditSaved] = useState(false);
  const saveProfile = async () => {
    const newName = editName.trim() || user.name;
    const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', user.id);
    
    if (!error) {
      onUpdateUser({ name: newName });
      setEditSaved(true);
      setTimeout(() => setEditSaved(false), 2000);
    }
  };

  // Change password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState(null);
  const [pwSaved, setPwSaved] = useState(false);
  const savePassword = () => {
    setPwError(null);
    if (newPassword.length < 6) return setPwError("Password should be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPwError("Passwords don't match.");
    setPwSaved(true);
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPwSaved(false), 2000);
  };

  // Study preferences
  const [favSubjects, setFavSubjects] = useState(user.favorite_subjects || []);
  const [dailyGoal, setDailyGoal] = useState(user.daily_goal || "30");
  const [prefsSaved, setPrefsSaved] = useState(false);
  
  // Update state if user prop changes (e.g. initial fetch)
  useEffect(() => {
    setFavSubjects(user.favorite_subjects || []);
    setDailyGoal(user.daily_goal || "30");
    setEditName(user.name || "");
  }, [user]);

  const toggleFavSubject = (s) =>
    setFavSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    
  const savePreferences = async () => {
    const { error } = await supabase.from('profiles').update({ favorite_subjects: favSubjects, daily_goal: dailyGoal }).eq('id', user.id);
    
    if (!error) {
      onUpdateUser({ favorite_subjects: favSubjects, daily_goal: dailyGoal });
      setPrefsSaved(true);
      setTimeout(() => {
        setPrefsSaved(false);
        onNavigate("study");
      }, 600);
    }
  };

  const rowStyle = (i, arr) => ({
    color: "#101C34",
    background: "#FFFFFF",
    borderBottom: i < arr.length - 1 || expanded ? "1px solid #E3EAFB" : "none",
  });

  const sections = ["edit", "password", "preferences"];
  const sectionLabels = { edit: "Edit profile", password: "Change password", preferences: "Study preferences" };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col w-full" style={{ background: "#F0F4FF", position: 'relative' }}>

      {/* ── DECORATIVE HEADER BAND ────────────────────────────────────────
          A rich gradient banner sits behind the avatar card area.
          Decorative shapes float within it so it feels alive.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "220px",
          background: "linear-gradient(135deg, #1a3dbf 0%, #2954E5 45%, #4f46e5 100%)",
          zIndex: 0,
        }}
      >
        {/* Soft circle — top left glow */}
        <div
          className="absolute -top-10 -left-10 w-52 h-52 rounded-full"
          style={{ background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.10), transparent 68%)" }}
        />
        {/* Tilted rounded rect — top right */}
        <div
          className="absolute top-4 right-[8%] w-28 h-28 rounded-[2rem]"
          style={{
            background: "rgba(255,255,255,0.06)",
            transform: "rotate(22deg)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        {/* Small rotated square — mid right */}
        <div
          className="absolute top-[40%] right-[22%] w-12 h-12 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            transform: "rotate(-14deg)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        />
        {/* Tiny dot — upper centre */}
        <div
          className="absolute top-6 left-[48%] w-5 h-5 rounded-full"
          style={{ background: "rgba(255,255,255,0.10)" }}
        />
        {/* Wide pill — lower band */}
        <div
          className="absolute bottom-8 left-[18%] w-48 h-8 rounded-full"
          style={{
            background: "rgba(255,255,255,0.04)",
            transform: "rotate(-4deg)",
          }}
        />
        {/* Arc ring — bottom left */}
        <div
          className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full"
          style={{ border: "2px solid rgba(255,255,255,0.06)", background: "transparent" }}
        />
        {/* Small dot — right edge */}
        <div
          className="absolute top-[30%] right-[5%] w-3 h-3 rounded-full"
          style={{ background: "rgba(255,255,255,0.12)" }}
        />
      </div>

      {/* ── SUBTLE PAGE-BODY ACCENTS ─────────────────────────────────────
          Very light shapes in the lower body area so the white cards
          pop against a gently textured background.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Soft radial — bottom right */}
        <div
          className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle at 55% 55%, rgba(41,84,229,0.07), rgba(41,84,229,0.004) 70%)" }}
        />
        {/* Soft radial — bottom left */}
        <div
          className="absolute bottom-10 -left-16 w-56 h-56 rounded-full"
          style={{ background: "radial-gradient(circle at 42% 55%, rgba(41,84,229,0.05), rgba(41,84,229,0.003) 70%)" }}
        />
        {/* Tiny tilted square — mid page */}
        <div
          className="absolute top-[55%] right-[6%] w-8 h-8 rounded-lg"
          style={{
            background: "rgba(41,84,229,0.06)",
            transform: "rotate(18deg)",
          }}
        />
      </div>

      {/* ── PAGE CONTENT ─────────────────────────────────────────────────
          Extra top padding so the content clears the gradient banner.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 px-4 sm:px-8 pt-10 pb-10" style={{ zIndex: 1 }}>
        <div className="max-w-xl mx-auto">

          {/* Page title — sits inside the coloured band */}
          <h2
            className="text-2xl font-semibold mb-6"
            style={{ color: "#FFFFFF", fontFamily: "'Montserrat', sans-serif" }}
          >
            Your Profile
          </h2>

          {/* Avatar card — overlaps the gradient band and the white body */}
          <div
            className="flex items-center gap-4 mb-6 p-5 rounded-2xl border"
            style={{
              borderColor: "#D8E3F8",
              background: "#FFFFFF",
              boxShadow: "0 8px 32px -8px rgba(41,84,229,0.14)",
            }}
          >
            {/* Avatar circle with a subtle ring */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #2954E5, #4f46e5)",
                boxShadow: "0 0 0 3px rgba(41,84,229,0.15)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-medium truncate" style={{ color: "#101C34" }}>{user.name || "Student"}</div>
              <div className="text-sm truncate" style={{ color: "#8493B0" }}>{user.email || "—"}</div>
            </div>
          </div>

          {/* Admin PDF Importer Card */}
          {isAdminUser(user) && (
            <div className="mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3" style={{ borderColor: "#2954E5", background: "#E8F1FE" }}>
              <div className="flex items-center gap-3">
                <Upload size={20} style={{ color: "#2954E5" }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#101C34" }}>Admin: PDF Textbook Importer</div>
                  <div className="text-xs" style={{ color: "#5A6B8C" }}>Upload PDF textbooks & extract chapters to database</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate("importer")}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0"
                style={{ background: "#2954E5" }}
              >
                Open Importer
              </button>
            </div>
          )}

          {/* Progress Tracker Card */}
          <div className="mb-8 p-5 rounded-2xl border" style={{ borderColor: "#D8E3F8", background: "#FFFFFF", boxShadow: "0 4px 16px -4px rgba(41,84,229,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} style={{ color: "#2954E5" }} />
              <h3 className="font-semibold text-[15px]" style={{ color: "#101C34" }}>Weekly Progress</h3>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: "#5A6B8C" }}>App visits this week</span>
              <span className="text-sm font-semibold" style={{ color: "#2954E5" }}>
                {weeklyProgress.filter(Boolean).length} / 7 Days
              </span>
            </div>
            
            <div className="flex justify-between gap-1.5 mt-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                const isActive = weeklyProgress[idx];
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                    <div 
                      className={`w-full h-8 rounded-lg flex items-center justify-center transition-all ${isActive ? 'scale-105 shadow-sm' : ''}`}
                      style={{ 
                        background: isActive ? 'linear-gradient(135deg, #2954E5, #4f46e5)' : '#F0F4FF',
                        border: isActive ? 'none' : '1px solid #E3EAFB'
                      }}
                    >
                      {isActive && <CheckCircle2 size={14} color="#FFFFFF" />}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: isActive ? "#101C34" : "#8493B0" }}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settings accordion */}
          <div className="rounded-2xl border overflow-hidden mb-8" style={{ borderColor: "#D8E3F8", boxShadow: "0 4px 16px -4px rgba(41,84,229,0.08)" }}>
            {sections.map((key, i, arr) => (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-left"
                  style={rowStyle(i, arr)}
                >
                  {sectionLabels[key]}
                  <ChevronRight size={16} style={{ color: "#8493B0", transform: expanded === key ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                </button>

                {expanded === key && key === "edit" && (
                  <div className="px-5 py-4 flex flex-col gap-3" style={{ background: "#FAFBFF", borderBottom: i < arr.length - 1 ? "1px solid #E3EAFB" : "none" }}>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#5A6B8C" }}>Full name</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#5A6B8C" }}>Email address</label>
                      <input value={user.email} disabled className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none bg-gray-50" style={{ borderColor: "#D8E3F8", color: "#8493B0" }} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={saveProfile} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2954E5" }}>Save changes</button>
                      {editSaved && <span className="text-xs font-medium" style={{ color: "#16A34A" }}>Saved ✓</span>}
                    </div>
                  </div>
                )}

                {expanded === key && key === "password" && (
                  <div className="px-5 py-4 flex flex-col gap-3" style={{ background: "#FAFBFF", borderBottom: i < arr.length - 1 ? "1px solid #E3EAFB" : "none" }}>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#5A6B8C" }}>New password</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#5A6B8C" }}>Confirm new password</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }} />
                    </div>
                    {pwError && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#FEF2F2", color: "#B91C1C" }}>{pwError}</p>}
                    <div className="flex items-center gap-3">
                      <button onClick={savePassword} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2954E5" }}>Update password</button>
                      {pwSaved && <span className="text-xs font-medium" style={{ color: "#16A34A" }}>Updated ✓</span>}
                    </div>
                  </div>
                )}

                {expanded === key && key === "preferences" && (
                  <div className="px-5 py-4 flex flex-col gap-4" style={{ background: "#FAFBFF", borderBottom: i < arr.length - 1 ? "1px solid #E3EAFB" : "none" }}>
                    <div>
                      <label className="text-xs font-medium mb-2 block" style={{ color: "#5A6B8C" }}>Favorite subjects</label>
                      <div className="flex flex-wrap gap-2">
                        {SUBJECTS.map((s) => {
                          const active = favSubjects.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => toggleFavSubject(s)}
                              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                              style={active ? { background: "#2954E5", borderColor: "#2954E5", color: "#FFFFFF" } : { borderColor: "#D8E3F8", color: "#5A6B8C", background: "#FFFFFF" }}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-2 block" style={{ color: "#5A6B8C" }}>Daily study goal</label>
                      <div className="flex gap-2">
                        {["15", "30", "60"].map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => setDailyGoal(min)}
                            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                            style={dailyGoal === min ? { background: "#2954E5", borderColor: "#2954E5", color: "#FFFFFF" } : { borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }}
                          >
                            {min} min
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={savePreferences} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#2954E5" }}>Save preferences</button>
                      {prefsSaved && <span className="text-xs font-medium" style={{ color: "#16A34A" }}>Saved ✓</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('study')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium border transition-colors hover:bg-blue-50"
              style={{ borderColor: "#D8E3F8", color: "#2954E5", background: "#FFFFFF" }}
            >
              <Home size={16} /> Back to Home
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium border transition-colors hover:bg-red-50"
              style={{ borderColor: "#FECACA", color: "#B91C1C", background: "#FFFFFF" }}
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
