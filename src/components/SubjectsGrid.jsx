import React from 'react';
import { BookOpen, Target, Clock, Trophy } from 'lucide-react';
import { SUBJECTS, CURRICULUM, SUBJECT_ICONS } from '../config';
import Footer from './Footer';

export default function SubjectsGrid({ onPick, onNavigate, user, completed = [] }) {
  const favs = user?.favorite_subjects || [];
  const displaySubjects = favs.length > 0 
    ? SUBJECTS.filter(s => favs.includes(s)) 
    : SUBJECTS;

  const dailyGoal = parseInt(user?.daily_goal || "30", 10);
  const minutesStudied = completed.length * 15; // Estimating 15 mins per topic completed
  const progressPercent = Math.min(100, Math.round((minutesStudied / dailyGoal) * 100)) || 0;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          
          {/* Daily Goal Tracker */}
          <div className="mb-8 p-5 rounded-2xl border" style={{ borderColor: "#D8E3F8", background: "#FFFFFF", boxShadow: "0 4px 16px -4px rgba(41,84,229,0.08)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={18} style={{ color: "#2954E5" }} />
                <h3 className="font-semibold text-[15px]" style={{ color: "#101C34" }}>Today's Goal</h3>
              </div>
              <div className="text-sm font-semibold" style={{ color: "#2954E5" }}>
                {minutesStudied} / {dailyGoal} mins
              </div>
            </div>
            
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "#F0F4FF" }}>
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #2954E5, #4f46e5)" }}
              />
            </div>
            
            <div className="mt-3 flex items-center justify-between text-xs font-medium" style={{ color: "#8493B0" }}>
              <span className="flex items-center gap-1.5"><Clock size={14}/> {Math.max(0, dailyGoal - minutesStudied)} mins left</span>
              {progressPercent >= 100 && <span className="flex items-center gap-1.5" style={{ color: "#16A34A" }}><Trophy size={14}/> Goal crushed!</span>}
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
            {favs.length > 0 ? "Your Study Subjects" : "What are we studying today?"}
          </h2>
          <p className="text-sm mb-7" style={{ color: "#8493B0" }}>
            {favs.length > 0 ? "Based on your study preferences." : "Pick a subject to see its JAMB curriculum, broken into lessons."}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displaySubjects.map((s) => {
              const Icon = SUBJECT_ICONS[s] || BookOpen;
              return (
                <button
                  key={s}
                  onClick={() => onPick(s)}
                  className="flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-shadow hover:shadow-sm"
                  style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E8F1FE" }}>
                    <Icon size={18} style={{ color: "#2954E5" }} />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium" style={{ color: "#101C34" }}>{s}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#8493B0" }}>{CURRICULUM[s].length} topics</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
