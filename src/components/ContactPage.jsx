import React from 'react';
import Footer from './Footer';
import BackToHomeButton from './BackToHomeButton';

export default function ContactPage({ onNavigate }) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: "#FAFBFF", position: 'relative' }}>

      {/* Coral / rose — warm, inviting, communication-themed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Radiating concentric rings — centre left (like a signal / broadcast) */}
        <div
          className="absolute top-[20%] -left-20 w-48 h-48 rounded-full"
          style={{ border: "2px solid rgba(239,68,68,0.08)", background: "transparent" }}
        />
        <div
          className="absolute top-[14%] -left-28 w-64 h-64 rounded-full"
          style={{ border: "1.5px solid rgba(239,68,68,0.05)", background: "transparent" }}
        />
        <div
          className="absolute top-[8%] -left-36 w-80 h-80 rounded-full"
          style={{ border: "1px solid rgba(239,68,68,0.03)", background: "transparent" }}
        />

        {/* Warm radial bloom — top right */}
        <div
          className="absolute -top-20 right-[-6%] w-[26rem] h-[26rem] rounded-full"
          style={{ background: "radial-gradient(circle at 62% 34%, rgba(251,113,133,0.09), rgba(251,113,133,0.006) 68%)" }}
        />

        {/* Soft pill — upper centre */}
        <div
          className="absolute top-12 left-[38%] w-32 h-8 rounded-full"
          style={{
            background: "linear-gradient(90deg, rgba(251,113,133,0.08), rgba(239,68,68,0.02))",
            transform: "rotate(-6deg)",
          }}
        />

        {/* Tilted rounded rectangle — mid right */}
        <div
          className="absolute top-[35%] right-[5%] w-20 h-32 rounded-[2rem]"
          style={{
            background: "linear-gradient(180deg, rgba(251,113,133,0.08), rgba(239,68,68,0.01))",
            transform: "rotate(15deg)",
            boxShadow: "0 30px 60px -24px rgba(251,113,133,0.18)",
          }}
        />

        {/* Small warm square — mid left */}
        <div
          className="absolute top-[50%] left-[6%] w-10 h-10 rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(251,113,133,0.10), rgba(239,68,68,0.02))",
            transform: "rotate(-20deg)",
            boxShadow: "0 14px 28px -12px rgba(251,113,133,0.20)",
          }}
        />

        {/* Large soft radial — bottom left */}
        <div
          className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle at 42% 55%, rgba(239,68,68,0.07), rgba(239,68,68,0.005) 68%)" }}
        />

        {/* Tiny radiating dots — upper right cluster */}
        <div
          className="absolute top-8 right-[28%] w-4 h-4 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,113,133,0.18), transparent 70%)" }}
        />
        <div
          className="absolute top-16 right-[24%] w-3 h-3 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,113,133,0.13), transparent 70%)" }}
        />
        <div
          className="absolute top-6 right-[20%] w-2 h-2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,113,133,0.10), transparent 70%)" }}
        />

        {/* Soft horizontal sweep — bottom */}
        <div
          className="absolute bottom-12 left-[26%] w-52 h-10 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(251,113,133,0.07), transparent)",
            transform: "rotate(-3deg)",
          }}
        />
      </div>

      {/* Page content — sits above decorations */}
      <div className="relative flex-1 px-4 sm:px-8 py-10" style={{ zIndex: 1 }}>
        <div className="max-w-2xl mx-auto">
          <BackToHomeButton onNavigate={onNavigate} />
          <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
            Contact Us
          </h2>
          <p className="text-sm mb-8" style={{ color: "#8493B0" }}>
            Questions, feedback, or something not working right? We'd like to hear about it.
          </p>

          <div className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4" style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}>
            <div>
              <div className="text-sm font-medium" style={{ color: "#101C34" }}>Email support</div>
              <div className="text-sm" style={{ color: "#8493B0" }}>hello@studybuddy.example</div>
            </div>
            <a
              href="mailto:hello@studybuddy.example"
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white text-center"
              style={{ background: "#2954E5" }}
            >
              Email us
            </a>
          </div>

          <p className="text-xs" style={{ color: "#8493B0" }}>
            This is placeholder contact info for the prototype — swap in your real support email or channel before launch.
          </p>
        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
