import React from 'react';
import TicketTag from './TicketTag';

export default function ChatBubble({ role, content, showTicket, subject, topic }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="max-w-[80%]">
        {!isUser && showTicket && <TicketTag subject={subject} topic={topic} />}
        <div
          className="px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap"
          style={
            isUser
              ? { background: "#2954E5", color: "#FFFFFF", borderBottomRightRadius: "4px" }
              : { background: "#E8F1FE", color: "#101C34", borderBottomLeftRadius: "4px" }
          }
        >
          {content}
        </div>
      </div>
    </div>
  );
}
