import React, { useState } from 'react';
import { BookOpen, User, Mail, Lock, Loader2, GraduationCap, CheckCircle2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

export default function AuthFlow({ onAuthenticated }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errors = {};
    if (mode === "signup" && !form.name.trim()) errors.name = true;
    if (!form.email.trim() || !form.email.includes("@")) errors.email = true;
    if (form.password.length < 6) errors.password = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.name) setError("Enter your full name.");
      else if (errors.email) setError("Enter a valid email address.");
      else if (errors.password) setError("Password should be at least 6 characters.");
      return;
    }

    setFieldErrors({});
    setLoading(true);
    
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.name.trim()
            }
          }
        });

        if (signUpError) throw signUpError;
        
        onAuthenticated({ name: form.name.trim(), email: form.email.trim() });
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password
        });

        if (signInError) throw signInError;

        const userMeta = data.user?.user_metadata || {};
        onAuthenticated({ name: userMeta.full_name || form.email.split("@")[0], email: form.email.trim() });
      }
    } catch (err) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (field) => ({
    borderColor: fieldErrors[field] ? "#DC2626" : "#D8E3F8",
    color: "#101C34",
    background: "#FFFFFF",
  });

  const inputStyle = "w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow";

  const perks = [
    "Built around the real JAMB syllabus",
    "Three study modes: textbook, summary & quizzes",
    "Instant feedback on every practice question",
    "Free to start — no credit card needed",
  ];

  return (
    <div
      className="min-h-screen flex w-full"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      {/* ══════════════════════════════════════════════════════════════
          LEFT PANEL — rich decorative brand panel (desktop only)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-14"
        style={{
          background: "linear-gradient(145deg, #0f2694 0%, #1a3dbf 30%, #2954E5 60%, #4338ca 100%)",
        }}
      >
        {/* ── Decorative floating shapes ─────────────────────────────── */}

        {/* Large soft radial — top right */}
        <div
          className="absolute -top-28 -right-28 w-[26rem] h-[26rem] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle at 55% 40%, rgba(255,255,255,0.10), transparent 65%)" }}
        />
        {/* Tilted rounded rect — upper left */}
        <div
          className="absolute top-10 left-[-3rem] w-48 h-48 rounded-[3rem] pointer-events-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            transform: "rotate(28deg)",
            border: "1.5px solid rgba(255,255,255,0.10)",
          }}
        />
        {/* Medium tilted rect — mid right */}
        <div
          className="absolute top-[38%] right-[-2rem] w-36 h-36 rounded-[2.5rem] pointer-events-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            transform: "rotate(-16deg)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        {/* Arc rings — bottom left */}
        <div
          className="absolute -bottom-14 -left-14 w-64 h-64 rounded-full pointer-events-none"
          style={{ border: "2px solid rgba(255,255,255,0.07)", background: "transparent" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ border: "1.5px solid rgba(255,255,255,0.04)", background: "transparent" }}
        />
        {/* Small diamond — mid left */}
        <div
          className="absolute top-[55%] left-[12%] w-14 h-14 rounded-2xl pointer-events-none"
          style={{
            background: "rgba(255,255,255,0.07)",
            transform: "rotate(45deg)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        />
        {/* Dot cluster — upper centre */}
        {[
          { top: "14%", left: "54%", size: "6px", opacity: 0.25 },
          { top: "18%", left: "60%", size: "4px", opacity: 0.18 },
          { top: "11%", left: "62%", size: "3px", opacity: 0.14 },
          { top: "22%", left: "56%", size: "5px", opacity: 0.16 },
        ].map((d, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: d.top, left: d.left,
              width: d.size, height: d.size,
              background: `rgba(255,255,255,${d.opacity})`,
            }}
          />
        ))}
        {/* Soft wide glow — bottom right */}
        <div
          className="absolute -bottom-10 right-0 w-72 h-48 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.07), transparent 70%)" }}
        />

        {/* ── Brand logo ─────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)" }}
          >
            <BookOpen size={18} color="#FFFFFF" />
          </div>
          <span
            className="font-semibold text-xl text-white"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            StudyBuddy
          </span>
        </div>

        {/* ── Hero copy ──────────────────────────────────────────────── */}
        <div className="relative z-10">
          {/* Icon badge */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.18)" }}
          >
            <GraduationCap size={32} color="#FFFFFF" />
          </div>

          <h2
            className="text-4xl font-semibold leading-tight text-white mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Study Smarter,<br />
            <span style={{ color: "rgba(255,255,255,0.75)" }}>Pass With Confidence</span>
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.65)" }}>
            Your personal JAMB study companion — learn, revise, and practise with a tool built around the actual exam syllabus.
          </p>

          {/* Perks list */}
          <div className="flex flex-col gap-3">
            {perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 size={16} style={{ color: "rgba(255,255,255,0.70)", shrink: 0 }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer tag ─────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center gap-1.5">
          <Sparkles size={13} style={{ color: "rgba(255,255,255,0.45)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'IBM Plex Mono', monospace" }}>
            JAMB-mapped · AI-powered · Free to start
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL — form area (full-width on mobile)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden"
        style={{ background: "#F0F4FF" }}
      >
        {/* Subtle body decorations — mobile & desktop right panel */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Soft radial — top right */}
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full"
            style={{ background: "radial-gradient(circle at 55% 38%, rgba(41,84,229,0.08), transparent 65%)" }}
          />
          {/* Soft radial — bottom left */}
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle at 42% 55%, rgba(41,84,229,0.06), transparent 65%)" }}
          />
          {/* Tilted pill — lower right */}
          <div
            className="absolute bottom-24 right-[8%] w-24 h-10 rounded-full"
            style={{
              background: "rgba(41,84,229,0.05)",
              transform: "rotate(-10deg)",
            }}
          />
          {/* Tiny square — mid left */}
          <div
            className="absolute top-[42%] left-[5%] w-8 h-8 rounded-lg"
            style={{
              background: "rgba(41,84,229,0.06)",
              transform: "rotate(18deg)",
            }}
          />
          {/* Dot — upper left */}
          <div
            className="absolute top-10 left-[20%] w-4 h-4 rounded-full"
            style={{ background: "rgba(41,84,229,0.08)" }}
          />
        </div>

        {/* ── Mobile-only logo (hidden on desktop) ───────────────────── */}
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden z-10">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#2954E5" }}>
            <BookOpen size={14} color="#FFFFFF" />
          </div>
          <span className="font-semibold text-base" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
            StudyBuddy
          </span>
        </div>

        {/* ── Form card ──────────────────────────────────────────────── */}
        <div
          className="relative z-10 w-full max-w-sm rounded-3xl p-8"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 8px 40px -8px rgba(41,84,229,0.16), 0 1px 4px rgba(41,84,229,0.06)",
            border: "1px solid rgba(216,227,248,0.8)",
          }}
        >
          {/* Card top — logo (desktop) or heading */}
          <div className="mb-6">
            <h1
              className="text-2xl font-semibold mb-1"
              style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}
            >
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm" style={{ color: "#8493B0" }}>
              {mode === "signup" ? "Start studying in under a minute." : "Log in to pick up where you left off."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8493B0" }} />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Full name"
                  className={inputStyle}
                  style={fieldStyle("name")}
                />
              </div>
            )}

            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8493B0" }} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Email address"
                className={inputStyle}
                style={fieldStyle("email")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8493B0" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Password"
                  className={inputStyle}
                  style={{ ...fieldStyle("password"), paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 focus:outline-none"
                  style={{ color: "#8493B0" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === "login" && (
                <button
                  type="button"
                  className="self-end text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: "#2954E5" }}
                  onClick={() => alert("Forgot password functionality coming soon!")}
                >
                  Forgot password?
                </button>
              )}
            </div>

            {error && (
              <p
                className="text-sm px-3 py-2.5 rounded-lg border font-medium"
                style={{ background: "#FEF2F2", color: "#B91C1C", borderColor: "#FECACA" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-white disabled:opacity-60 active:scale-[0.98] transition-transform hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #2954E5, #4338ca)" }}
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="text-sm text-center mt-5" style={{ color: "#8493B0" }}>
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
              className="font-medium"
              style={{ color: "#2954E5" }}
            >
              {mode === "signup" ? "Log in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
