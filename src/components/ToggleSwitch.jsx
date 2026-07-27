import React from 'react';

export default function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
      style={{ background: checked ? "#2954E5" : "#D8E3F8" }}
      aria-pressed={checked}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: checked ? "22px" : "2px" }}
      />
    </button>
  );
}
