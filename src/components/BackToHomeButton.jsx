import React from 'react';
import { Home } from 'lucide-react';

/**
 * Reusable "Back to Home" button.
 * Drop it anywhere — it navigates to the 'study' page.
 */
export default function BackToHomeButton({ onNavigate }) {
  return (
    <button
      onClick={() => onNavigate('study')}
      className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
      style={{ color: '#2954E5' }}
      aria-label="Back to Home"
    >
      <Home size={14} />
      Back to Home
    </button>
  );
}
