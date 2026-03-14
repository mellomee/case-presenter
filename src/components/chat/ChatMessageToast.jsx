import React, { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

export default function ChatMessageToast({ message, onOpen, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <button
        onClick={() => { setVisible(false); setTimeout(onOpen, 200); }}
        className="w-full text-left p-3 pr-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-slate-700">{message.sender_name}</span>
          <span className="text-xs text-slate-400 ml-auto">now</span>
        </div>
        <p className="text-sm text-slate-600 leading-snug line-clamp-2 pl-8">{message.text}</p>
      </button>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}