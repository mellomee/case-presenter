import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Scale, LayoutDashboard, FileText, Users, BookOpen, Tv, Settings, MessageSquare, Menu, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ChatPanel from './chat/ChatPanel.jsx';
import ChatMessageToast from './chat/ChatMessageToast.jsx';

export default function Layout() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [lastSeen, setLastSeen] = useState(() => Date.now());
  const [toastMessage, setToastMessage] = useState(null);

  // Pages that should hide the chat button
  const hideChatPages = ['/JuryView'];
  const showChat = !hideChatPages.some(p => location.pathname.includes(p));

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  // Track unread count via real-time subscription
  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data?.sender_id !== user?.id) {
        if (!chatOpen) {
          setUnread(n => n + 1);
          setToastMessage(event.data);
        }
      }
    });
    return unsub;
  }, [chatOpen, user?.id]);

  const handleOpenChat = () => {
    setChatOpen(true);
    setUnread(0);
    setLastSeen(Date.now());
  };

  const navItems = [
    { label: 'Dashboard', path: '/Dashboard', icon: LayoutDashboard },
    { label: 'Proof Vault', path: '/ProofVault', icon: FileText },
    { label: 'Parties', path: '/Parties', icon: Users },
    { label: 'Exam Builder', path: '/ExamBuilder', icon: BookOpen },
    { label: 'Present', path: '/AttorneyView', icon: Tv },
    { label: 'Settings', path: '/Settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo / App Name */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-1">
            <Scale className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">Case Presenter</h1>
          </div>
          <p className="text-xs text-slate-500">Trial Management System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 pl-3'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          <p>© 2026 Case Presenter</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-8">
          <div className="flex-1">
            <p className="text-sm text-slate-600">Welcome to Case Presenter</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* Floating Chat Button */}
      {showChat && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          title="Team Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Incoming message toast */}
      {toastMessage && !chatOpen && showChat && (
        <ChatMessageToast
          message={toastMessage}
          onOpen={() => { setToastMessage(null); handleOpenChat(); }}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {/* Chat Panel */}
      {chatOpen && showChat && (
        <ChatPanel onClose={() => setChatOpen(false)} user={user} />
      )}
    </div>
  );
}