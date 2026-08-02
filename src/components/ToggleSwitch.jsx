import React from 'react';

export default function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-11 h-6 rounded-full relative shrink-0 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: checked ? "#2954E5" : "#D8E3F8" }}
      aria-pressed={checked}
      aria-disabled={disabled}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-xs"
        style={{ left: checked ? "22px" : "2px" }}
      />
    </button>
  );
}
