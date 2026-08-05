import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Check, 
  Lock, 
  Calendar, 
  Target, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  CheckCircle2,
  AlertCircle,
  Award,
  BookMarked,
  Microscope,
  Atom,
  FlaskConical,
  Calculator,
  Landmark,
  Scale,
  Feather,
  Sprout,
  Globe,
  Briefcase
} from 'lucide-react';
import { supabase } from '../supabase';
import { SUBJECTS, SUBJECT_ICONS } from '../config';

const EXTENDED_ELECTIVES = [
  "Mathematics",
  "Biology",
  "Physics",
  "Chemistry",
  "Economics",
  "Government",
  "Literature-in-English",
  "Agricultural Science",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Geography",
  "Commerce",
  "Accounting",
  "History",
  "Computer Studies"
];

const SCORE_TARGETS = [
  { value: "180+", label: "180+", subtitle: "Foundation Mastery", desc: "Core syllabus competency and foundational CBT drills" },
  { value: "200+", label: "200+", subtitle: "Core Competency", desc: "Balanced syllabus review with distractor analysis" },
  { value: "250+", label: "250+", subtitle: "Advanced Proficiency", desc: "Rigorous practice drills & detailed theoretical explanations", recommended: true },
  { value: "300+", label: "300+", subtitle: "Elite / Merit Distinction", desc: "High-difficulty problem solving, speed drills & deep rigor" },
];

export default function ExamSetupWizard({ user, onFinish }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 states
  const [selectedYear, setSelectedYear] = useState("JAMB 2027");
  const [customDate, setCustomDate] = useState("");
  const [targetScore, setTargetScore] = useState("250+");

  // Step 2 states - electives (excluding compulsory English Language)
  const [selectedElectives, setSelectedElectives] = useState(["Biology", "Chemistry", "Physics"]);

  // Set default target exam date based on selected year
  const getTargetDate = () => {
    if (selectedYear === "Other" && customDate) {
      return new Date(customDate).toISOString();
    }
    if (selectedYear === "JAMB 2028") {
      return new Date("2028-04-15T09:00:00Z").toISOString();
    }
    return new Date("2027-04-15T09:00:00Z").toISOString();
  };

  const handleToggleElective = (subject) => {
    if (selectedElectives.includes(subject)) {
      setSelectedElectives(prev => prev.filter(s => s !== subject));
    } else {
      if (selectedElectives.length >= 3) return; // Enforce max 3 electives
      setSelectedElectives(prev => [...prev, subject]);
    }
  };

  const handleCompleteSetup = async () => {
    if (selectedElectives.length !== 3) {
      setError("Please select exactly 3 additional subjects to complete your combination.");
      return;
    }
    setError("");
    setSaving(true);

    const fullCombination = ["English Language", ...selectedElectives];
    const targetDateIso = getTargetDate();

    const payload = {
      exam_goal: "JAMB",
      exam_year: selectedYear === "Other" ? (customDate ? new Date(customDate).getFullYear().toString() : "Custom") : selectedYear.replace("JAMB ", ""),
      target_score: targetScore,
      target_exam_date: targetDateIso,
      subject_combination: fullCombination,
      favorite_subjects: fullCombination,
    };

    try {
      // 1. Save to Supabase Auth metadata if authenticated
      if (user?.id && supabase?.auth) {
        await supabase.auth.updateUser({
          data: payload
        }).catch(err => console.warn("Could not sync auth metadata:", err));

        // 2. Save to Supabase profiles table
        await supabase
          .from("profiles")
          .update({ favorite_subjects: fullCombination })
          .eq("id", user.id)
          .catch(err => console.warn("Could not sync profile table:", err));

        // 3. Persist to localStorage
        localStorage.setItem(`sb_exam_goal_${user.id}`, "JAMB");
        localStorage.setItem(`sb_exam_year_${user.id}`, payload.exam_year);
        localStorage.setItem(`sb_target_score_${user.id}`, targetScore);
        localStorage.setItem(`sb_target_date_${user.id}`, targetDateIso);
        localStorage.setItem(`sb_subjects_${user.id}`, JSON.stringify(fullCombination));
        localStorage.setItem(`sb_setup_completed_${user.id}`, "true");
      }
    } catch (err) {
      console.error("Error during setup persistence:", err);
    } finally {
      setSaving(false);
      onFinish(payload);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Container Card */}
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-xl border border-slate-200/80 overflow-hidden flex flex-col my-8">
        
        {/* Top Progress & Banner Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 px-6 sm:px-10 py-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-3 text-blue-100 border border-white/20">
                <Sparkles size={14} className="text-amber-300" />
                <span>Personalized AI Tutor Setup</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Welcome to StudyBuddy!
              </h1>
              <p className="text-sm sm:text-base text-blue-100 font-medium mt-1">
                Let's customize your learning environment for maximum JAMB success.
              </p>
            </div>
            
            {/* Step indicators */}
            <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm self-stretch sm:self-auto justify-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${step === 1 ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-600/60 text-white/90'}`}>1</span>
              <div className="w-6 sm:w-8 h-1 bg-white/30 rounded-full overflow-hidden">
                <div className={`h-full bg-white transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${step === 2 ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-600/60 text-white/60'}`}>2</span>
            </div>
          </div>
        </div>

        {/* Step 1: JAMB Year & Score Goal */}
        {step === 1 && (
          <div className="p-6 sm:p-10 space-y-8 flex-1 flex flex-col justify-between">
            <div className="space-y-8">
              
              {/* Question 1: Year */}
              <div>
                <label className="block text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 mb-2 flex items-center gap-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>Which JAMB exam year are you preparing for?</span>
                </label>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold mb-4">
                  This calibrates your countdown clock and daily revision pace. You can edit this anytime in your Profile.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  {["JAMB 2027", "JAMB 2028", "Other"].map((yr) => {
                    const isSelected = selectedYear === yr;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setSelectedYear(yr)}
                        className={`p-4 sm:p-5 rounded-2xl text-left border-2 transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? "border-blue-600 bg-blue-50/80 shadow-md text-blue-900 font-extrabold" 
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 font-bold"
                        }`}
                      >
                        <span className="text-base sm:text-lg">{yr}</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedYear === "Other" && (
                  <div className="mt-4 animate-fadeIn">
                    <label className="block text-xs sm:text-sm font-extrabold text-slate-700 mb-1">
                      Select your target exam date:
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full sm:w-80 px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-600 outline-none font-bold text-slate-800 shadow-xs"
                    />
                  </div>
                )}
              </div>

              <hr className="border-slate-200/80" />

              {/* Question 2: Target Score */}
              <div>
                <label className="block text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 mb-2 flex items-center gap-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <Target className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>What score are you aiming for in JAMB?</span>
                </label>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold mb-4">
                  StudyBuddy adjusts AI practice question difficulty and explanation depth based on your target goal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {SCORE_TARGETS.map((t) => {
                    const isSelected = targetScore === t.value;
                    return (
                      <div
                        key={t.value}
                        onClick={() => setTargetScore(t.value)}
                        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected 
                            ? "border-indigo-600 bg-indigo-50/70 shadow-md text-indigo-950" 
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                        }`}
                      >
                        {t.recommended && (
                          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                            Recommended
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                              {t.label}
                            </span>
                            <span className="font-extrabold text-xs sm:text-sm text-slate-700 uppercase tracking-wide">
                              {t.subtitle}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed mt-1">
                            {t.desc}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-extrabold text-indigo-600">
                          <span>{isSelected ? "Active Target Level" : "Click to select"}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Step 1 navigation */}
            <div className="pt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-extrabold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Next: Select Subjects</span>
                <ArrowRight size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: JAMB Subject Combination */}
        {step === 2 && (
          <div className="p-6 sm:p-10 flex-1 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Select Your JAMB Subject Combination
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
                    English Language is compulsory. Select exactly 3 additional electives for your target course.
                  </p>
                </div>
                <div className="px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full font-extrabold text-xs text-blue-800 inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <Award size={15} className="text-blue-600" />
                  <span>{selectedElectives.length} of 3 electives chosen</span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Compulsory Locked Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-400 text-emerald-950 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <CheckCircle2 size={26} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base sm:text-lg">English Language / Use of English</span>
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                        <Lock size={12} strokeWidth={2.5} />
                        <span>Compulsory</span>
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-800 font-semibold mt-0.5">
                      Standard compulsory subject for all JAMB candidates across sciences, arts, and commercial courses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Elective Grid */}
              <div>
                <label className="block text-xs sm:text-sm uppercase font-extrabold tracking-wider text-slate-500 mb-3">
                  Choose 3 Electives ({selectedElectives.length}/3 Selected):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {EXTENDED_ELECTIVES.map((subject) => {
                    const isSelected = selectedElectives.includes(subject);
                    const isMaxReached = !isSelected && selectedElectives.length >= 3;
                    const IconComp = SUBJECT_ICONS[subject] || BookOpen;

                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => {
                          if (!isMaxReached || isSelected) {
                            handleToggleElective(subject);
                          }
                        }}
                        disabled={isMaxReached}
                        className={`p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-md scale-[1.02]"
                            : isMaxReached
                              ? "border-slate-200 bg-slate-100/70 text-slate-400 opacity-60 cursor-not-allowed"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-bold hover:-translate-y-0.5 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <IconComp size={18} strokeWidth={2} />
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-white text-blue-600 border-white' : 'border-slate-300 bg-white'}`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                        <span className="font-black text-xs sm:text-[13.5px] truncate leading-tight mt-2 block w-full" title={subject}>
                          {subject}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Your JAMB Combination Summary Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-3 text-emerald-400 font-mono uppercase text-xs sm:text-sm font-black tracking-wider">
                  <Award size={18} strokeWidth={2.5} />
                  <span>Your Official JAMB Combination Summary</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/10 border border-white/15 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 truncate">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="truncate">English Language</span>
                    <span className="text-[10px] opacity-70 ml-auto">(Locked)</span>
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const sub = selectedElectives[idx];
                    return (
                      <div key={idx} className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center gap-2 truncate ${sub ? 'bg-white/10 border-white/15 text-white' : 'bg-white/5 border-dashed border-white/10 text-white/40'}`}>
                        <span className={sub ? "text-emerald-400 shrink-0" : "opacity-40"}>✓</span>
                        <span className="truncate">{sub || `Elective slot #${idx + 1}`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Navigation */}
            <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-sm sm:text-base transition-colors cursor-pointer"
              >
                ← Back
              </button>
              
              <button
                type="button"
                onClick={handleCompleteSetup}
                disabled={saving || selectedElectives.length !== 3}
                className={`px-8 py-4 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2.5 shadow-lg ${
                  selectedElectives.length === 3 && !saving
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer active:scale-95 shadow-blue-600/30"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                }`}
              >
                {saving ? (
                  <span>Saving & Preparing AI Tutor...</span>
                ) : (
                  <>
                    <span>Complete Setup & Launch Dashboard</span>
                    <ArrowRight size={20} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      <p className="text-center text-xs text-slate-500 font-semibold max-w-md">
        StudyBuddy uses these preferences to tailor AI practice quizzes, reading recommendations, and syllabus coverage directly to your exam ambitions.
      </p>
    </div>
  );
}
