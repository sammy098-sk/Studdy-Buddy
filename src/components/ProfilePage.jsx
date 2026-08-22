import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, LogOut, Activity, CheckCircle2, Home, Upload, Lock, Calendar, Target, Award, Check, Camera, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
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
      // Calculate Monday of current week at 00:00:00 local time without mutation bugs
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sun, 1 is Mon...
      const daysFromMon = currentDay === 0 ? 6 : currentDay - 1;
      
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMon, 0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);
      
      // Safety buffer when querying UTC timestamps in database
      const queryMin = new Date(startOfWeek.getTime() - 24 * 3600 * 1000).toISOString();

      const [progressRes, readingRes, sessionsRes] = await Promise.all([
        supabase.from('study_progress').select('created_at').eq('user_id', user.id).gte('created_at', queryMin),
        supabase.from('reading_progress').select('updated_at, last_read_at').eq('user_id', user.id).gte('updated_at', queryMin),
        supabase.from('study_sessions').select('started_at').eq('user_id', user.id).gte('started_at', queryMin)
      ]);

      let progress = [false, false, false, false, false, false, false];
      const allTimestamps = [];

      if (progressRes.data) progressRes.data.forEach(r => r.created_at && allTimestamps.push(r.created_at));
      if (readingRes.data) readingRes.data.forEach(r => {
        if (r.updated_at) allTimestamps.push(r.updated_at);
        if (r.last_read_at) allTimestamps.push(r.last_read_at);
      });
      if (sessionsRes.data) sessionsRes.data.forEach(r => r.started_at && allTimestamps.push(r.started_at));

      allTimestamps.forEach(ts => {
        const recordDate = new Date(ts);
        if (!isNaN(recordDate) && recordDate >= startOfWeek && recordDate <= endOfWeek) {
          const d = recordDate.getDay();
          const index = d === 0 ? 6 : d - 1;
          progress[index] = true;
        }
      });

      // Ensure today is marked active immediately for live motivational feedback
      const todayIndex = currentDay === 0 ? 6 : currentDay - 1;
      if (!progress[todayIndex]) {
        await supabase.from('study_progress').insert({ user_id: user.id, topic_label: 'Profile Visit Check-in' });
        progress[todayIndex] = true;
      }

      setWeeklyProgress(progress);
    };

    if (user?.id) {
      fetchWeeklyProgress();
    }
  }, [user]);

  // Avatar Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAvatarMenu(false);
    setUploadingAvatar(true);

    try {
      // Client-side canvas crop & compress
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(res => img.onload = res);

      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height, 500);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Failed to process image");
        
        const fileName = `${user.id}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase.from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (dbError) throw dbError;

        onUpdateUser({ avatar_url: publicUrl });
      }, 'image/jpeg', 0.85);
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert("Failed to upload avatar. Please ensure the 'avatars' storage bucket exists and is public.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  // Study & Exam preferences
  const [favSubjects, setFavSubjects] = useState(() => {
    const subs = user.favorite_subjects || [];
    return subs.includes("English Language") ? subs : ["English Language", ...subs];
  });
  const [dailyGoal, setDailyGoal] = useState(user.daily_goal || "30");
  const [examYear, setExamYear] = useState(user.exam_year || "2027");
  const [targetScore, setTargetScore] = useState(user.target_score || "250+");
  const [targetDate, setTargetDate] = useState(user.target_exam_date ? user.target_exam_date.slice(0, 10) : "2027-04-15");
  const [prefsSaved, setPrefsSaved] = useState(false);
  
  // Update state if user prop changes
  useEffect(() => {
    const subs = user.favorite_subjects || [];
    setFavSubjects(subs.includes("English Language") ? subs : ["English Language", ...subs.filter(s => s !== "English Language")]);
    setDailyGoal(user.daily_goal || "30");
    setEditName(user.name || "");
    setExamYear(user.exam_year || "2027");
    setTargetScore(user.target_score || "250+");
    if (user.target_exam_date) {
      setTargetDate(user.target_exam_date.slice(0, 10));
    }
  }, [user]);

  const toggleFavSubject = (s) => {
    if (s === "English Language") return; // Compulsory and locked
    setFavSubjects((prev) => {
      if (prev.includes(s)) {
        return prev.filter((x) => x !== s);
      } else {
        // Only allow up to 3 additional electives (4 total including English)
        const electives = prev.filter(item => item !== "English Language");
        if (electives.length >= 3) return prev;
        return [...prev, s];
      }
    });
  };
    
  const savePreferences = async () => {
    const targetDateIso = new Date(targetDate).toISOString();
    const payload = {
      exam_goal: "JAMB",
      exam_year: examYear,
      target_score: targetScore,
      target_exam_date: targetDateIso,
      subject_combination: favSubjects,
      favorite_subjects: favSubjects,
      daily_goal: dailyGoal
    };

    if (user?.id && supabase?.auth) {
      await supabase.auth.updateUser({ data: payload }).catch(() => {});
    }

    const { error } = await supabase.from('profiles').update({ favorite_subjects: favSubjects, daily_goal: dailyGoal }).eq('id', user.id);
    
    if (!error) {
      localStorage.setItem(`sb_exam_goal_${user.id}`, "JAMB");
      localStorage.setItem(`sb_exam_year_${user.id}`, examYear);
      localStorage.setItem(`sb_target_score_${user.id}`, targetScore);
      localStorage.setItem(`sb_target_date_${user.id}`, targetDateIso);
      localStorage.setItem(`sb_subjects_${user.id}`, JSON.stringify(favSubjects));
      localStorage.setItem(`sb_setup_completed_${user.id}`, "true");

      onUpdateUser(payload);
      setPrefsSaved(true);
      setTimeout(() => {
        setPrefsSaved(false);
        onNavigate("study");
      }, 800);
    }
  };

  const rowStyle = (i, arr) => ({
    color: "#101C34",
    background: "#FFFFFF",
    borderBottom: i < arr.length - 1 || expanded ? "1px solid #E3EAFB" : "none",
  });

  const sections = ["edit", "password", "preferences"];
  const sectionLabels = { edit: "Edit profile", password: "Change password", preferences: "JAMB Preferences" };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col w-full" style={{ background: "#edf5f1", position: 'relative' }}>

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
      <div className="relative flex-1 px-4 sm:px-8 lg:px-12 pt-10 pb-12" style={{ zIndex: 1 }}>
        <div className="max-w-xl lg:max-w-3xl xl:max-w-4xl mx-auto">

          {/* Page title — sits inside the coloured band */}
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-6 lg:mb-8"
            style={{ color: "#FFFFFF", fontFamily: "'Montserrat', sans-serif" }}
          >
            Your Profile
          </h2>

          {/* Avatar card — overlaps the gradient band and the white body */}
          <div
            className="flex items-center gap-4 lg:gap-6 mb-6 sm:mb-8 p-5 lg:p-7 rounded-2xl lg:rounded-3xl border"
            style={{
              borderColor: "#D8E3F8",
              background: "#FFFFFF",
              boxShadow: "0 8px 32px -8px rgba(41,84,229,0.14)",
            }}
          >
            {/* Avatar circle with a subtle ring */}
            <div className="relative group shrink-0">
              <div
                className="w-16 h-16 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-xl lg:text-3xl font-extrabold text-white overflow-hidden relative cursor-pointer"
                style={{
                  background: user.avatar_url ? '#fff' : "linear-gradient(135deg, #2954E5, #4f46e5)",
                  boxShadow: "0 0 0 3px rgba(41,84,229,0.15)",
                }}
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
                
                {/* Hover overlay for upload */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? <Loader2 size={24} className="animate-spin text-white" /> : <Camera size={24} className="text-white" />}
                </div>
              </div>

              {/* Upload Menu */}
              {showAvatarMenu && (
                <div className="absolute top-[105%] left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1">
                  <button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                    <Camera size={16} className="text-blue-600" />
                    Upload from device
                  </button>
                  <button disabled className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-400 flex items-center gap-2.5 cursor-not-allowed border-t border-slate-100">
                    <Sparkles size={16} />
                    Generate AI Avatar <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-400 uppercase tracking-wider">Soon</span>
                  </button>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="text-[15px] sm:text-lg lg:text-2xl font-extrabold truncate" style={{ color: "#101C34" }}>{user.name || "Student"}</div>
              <div className="text-sm lg:text-base font-medium truncate mt-0.5" style={{ color: "#8493B0" }}>{user.email || "—"}</div>
            </div>
          </div>

          {/* Admin PDF Importer Card */}
          {isAdminUser(user) && (
            <div className="mb-6 lg:mb-8 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border flex items-center justify-between gap-4" style={{ borderColor: "#2954E5", background: "#E8F1FE" }}>
              <div className="flex items-center gap-3.5">
                <Upload size={24} style={{ color: "#2954E5" }} />
                <div>
                  <div className="text-sm lg:text-lg font-bold" style={{ color: "#101C34" }}>Admin: PDF Textbook Importer</div>
                  <div className="text-xs lg:text-sm font-medium mt-0.5" style={{ color: "#5A6B8C" }}>Upload PDF textbooks & extract chapters to database</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate("importer")}
                className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold text-white shrink-0 shadow-sm"
                style={{ background: "#2954E5" }}
              >
                Open Importer
              </button>
            </div>
          )}

          {/* Progress Tracker Card */}
          <div className="mb-8 lg:mb-10 p-5 lg:p-8 rounded-2xl lg:rounded-3xl border" style={{ borderColor: "#D8E3F8", background: "#FFFFFF", boxShadow: "0 4px 16px -4px rgba(41,84,229,0.08)" }}>
            <div className="flex items-center gap-2.5 lg:gap-3 mb-4 lg:mb-6">
              <Activity size={20} style={{ color: "#2954E5" }} className="lg:w-7 lg:h-7" />
              <h3 className="font-extrabold text-[15px] sm:text-lg lg:text-2xl" style={{ color: "#101C34" }}>Weekly Activity Tracker</h3>
            </div>
            
            <div className="flex justify-between items-center mb-5 lg:mb-6">
              <span className="text-sm lg:text-base font-medium" style={{ color: "#5A6B8C" }}>App engagement & study sessions this week</span>
              <span className="text-sm lg:text-lg font-extrabold px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                {weeklyProgress.filter(Boolean).length} / 7 Days Active
              </span>
            </div>
            
            <div className="flex justify-between gap-2 lg:gap-3.5 mt-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                const isActive = weeklyProgress[idx];
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 lg:gap-3 flex-1">
                    <div 
                      className={`w-full h-8 sm:h-10 lg:h-14 rounded-lg lg:rounded-2xl flex items-center justify-center transition-all ${isActive ? 'scale-105 shadow-md shadow-blue-500/20' : ''}`}
                      style={{ 
                        background: isActive ? 'linear-gradient(135deg, #2954E5, #4f46e5)' : '#F0F4FF',
                        border: isActive ? 'none' : '1px solid #E3EAFB'
                      }}
                    >
                      {isActive ? (
                        <CheckCircle2 size={16} color="#FFFFFF" className="lg:w-6 lg:h-6" />
                      ) : (
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <span className="text-[11px] lg:text-sm font-bold truncate" style={{ color: isActive ? "#101C34" : "#8493B0" }}>
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
                  <div className="px-5 sm:px-8 py-6 flex flex-col gap-6" style={{ background: "#FAFBFF", borderBottom: i < arr.length - 1 ? "1px solid #E3EAFB" : "none" }}>
                    
                    {/* Exam Year & Target Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200/80">
                      <div>
                        <label className="text-sm font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                          <Calendar size={16} className="text-blue-600" />
                          <span>Target JAMB Exam Year</span>
                        </label>
                        <div className="flex gap-2 mb-3">
                          {["2027", "2028", "Custom"].map((yr) => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => {
                                setExamYear(yr);
                                if (yr === "2027") setTargetDate("2027-04-15");
                                if (yr === "2028") setTargetDate("2028-04-15");
                              }}
                              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all"
                              style={examYear === yr ? { background: "#2954E5", borderColor: "#2954E5", color: "#FFFFFF" } : { borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }}
                            >
                              {yr === "Custom" ? "Other" : `JAMB ${yr}`}
                            </button>
                          ))}
                        </div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Target Exam Date (Countdown Clock):</label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full sm:w-48 px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm text-slate-800 focus:outline-blue-600"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                          <Target size={16} className="text-indigo-600" />
                          <span>Target Score (AI Difficulty Tier)</span>
                        </label>
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                          Controls rigor of AI summaries and CBT diagnostic practice.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {["180+", "200+", "250+", "300+"].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setTargetScore(score)}
                              className="px-3 py-2.5 rounded-xl text-sm font-extrabold border transition-all flex items-center justify-between"
                              style={targetScore === score ? { background: "#4F46E5", borderColor: "#4F46E5", color: "#FFFFFF", boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)" } : { borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }}
                            >
                              <span>{score}</span>
                              {targetScore === score && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Subject Combination */}
                    <div className="pb-6 border-b border-slate-200/80">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <label className="text-sm font-extrabold text-slate-800 block flex items-center gap-2">
                            <Award size={16} className="text-purple-600" />
                            <span>Your JAMB Combination</span>
                          </label>
                          <span className="text-xs text-slate-500 font-bold">
                            Use of English is locked. Select exactly 3 additional electives ({favSubjects.filter(s => s !== "English Language").length}/3 selected).
                          </span>
                        </div>
                      </div>

                      {/* Locked English Badge */}
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-900 font-extrabold text-xs sm:text-sm flex items-center justify-between mb-3">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>✅ Use of English (Locked)</span>
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-200/80 rounded uppercase tracking-wider text-[10px] font-black flex items-center gap-1">
                          <Lock size={11} /> Compulsory
                        </span>
                      </div>

                      {/* Electives Grid */}
                      <div className="flex flex-wrap gap-2">
                        {SUBJECTS.filter(s => s !== "English Language").map((s) => {
                          const active = favSubjects.includes(s);
                          const electivesCount = favSubjects.filter(sub => sub !== "English Language").length;
                          const disabled = !active && electivesCount >= 3;

                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleFavSubject(s)}
                              className={`text-xs sm:text-[13px] font-extrabold px-3.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${
                                disabled ? 'opacity-40 cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:-translate-y-0.5'
                              }`}
                              style={active ? { background: "#2954E5", borderColor: "#2954E5", color: "#FFFFFF" } : { borderColor: "#D8E3F8", color: "#5A6B8C", background: "#FFFFFF" }}
                            >
                              <span>{s}</span>
                              {active && <span>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Daily study goal */}
                    <div>
                      <label className="text-sm font-extrabold text-slate-800 block mb-1">Daily Study Goal (Time Spend)</label>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Sets daily active reading session milestones on your dashboard.</p>
                      <div className="flex flex-wrap gap-2">
                        {["15", "30", "45", "60", "120"].map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => setDailyGoal(min)}
                            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition-all"
                            style={dailyGoal === min ? { background: "#2954E5", borderColor: "#2954E5", color: "#FFFFFF" } : { borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }}
                          >
                            {min} min
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-4 pt-2">
                      <button 
                        onClick={savePreferences} 
                        className="px-6 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-95 active:scale-95 shadow-md flex items-center gap-2 cursor-pointer" 
                        style={{ background: "#2954E5" }}
                      >
                        <span>Save & Update AI Tutor</span>
                      </button>
                      {prefsSaved && <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1">Preferences Updated ✓</span>}
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
