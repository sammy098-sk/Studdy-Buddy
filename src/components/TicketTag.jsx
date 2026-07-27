import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function TicketTag({ subject, topic }) {
  return (
    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1.5 rounded-md border border-dashed"
      style={{ borderColor: "#B7CBF5", background: "#F3F7FF" }}>
      <GraduationCap size={13} style={{ color: "#2954E5" }} />
      <span className="text-[11px] tracking-wide uppercase font-medium" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
        {subject}{topic ? ` · ${topic}` : ""}
      </span>
    </div>
  );
}
