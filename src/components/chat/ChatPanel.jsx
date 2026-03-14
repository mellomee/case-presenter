import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Send, Loader } from 'lucide-react';

export default function ChatPanel({ onClose, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const THREAD = 'general';

  // Load messages
  useEffect(() => {
    base44.entities.ChatMessage.filter({ thread_id: THREAD }, '-created_date', 50)
      .then(msgs => setMessages(msgs.reverse()));
  }, []);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.thread_id !== THREAD) return;
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsub;
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await base44.entities.ChatMessage.create({
        thread_id: THREAD,
        sender_id: user?.id || 'unknown',
        sender_name: user?.full_name || 'User',
        text: trimmed,
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMe = (msg) => msg.sender_id === user?.id;

  return (
    <div className="fixed right-0 bottom-0 top-0 w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Team Chat</h3>
          <p className="text-xs text-slate-500">General channel</p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400">No messages yet. Say hello!</div>
        )}
        {messages.map((msg) => {
          const mine = isMe(msg);
          return (
            <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && (
                <span className="text-xs text-slate-500 mb-0.5 ml-1">{msg.sender_name}</span>
              )}
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                mine
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 mx-1">{formatTime(msg.created_date)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            className="flex-1 resize-none border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700 h-9 w-9 flex-shrink-0"
          >
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}