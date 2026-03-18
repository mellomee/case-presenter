import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Scale, LayoutDashboard, FileText, Users, BookOpen, Tv, Settings, MessageSquare, Menu, X, FolderKanban } from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pages that should hide the chat button
  const hideChatPages = ['/present/jury', '/JuryView'];
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
    { label: 'Exam Builder V2', path: '/ExamBuilderV2', icon: FolderKanban },
    {
      label: 'Present',
      path: '/present',
      icon: Tv,
      children: [
        { label: 'Attorney Hub', path: '/AttorneyHub' },
        { label: 'Attorney View', path: '/present/attorney' },
        { label: 'Jury View', path: '/present/jury' },
      ],
    },
    { label: 'Settings', path: '/Settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  const SidebarContent = () => (
    <>
      {/* Logo / App Name */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-lg font-bold text-slate-900">Case Presenter</h1>
          </div>
          <button className="lg:hidden p-1 text-slate-400 hover:text-slate-600" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1 pl-9">Trial Management System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            if (item.children) {
              return (
                <li key={item.path} className="space-y-1">
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md min-h-[44px] ${
                      active
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 pl-2'
                        : 'text-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>

                  <div className="ml-6 space-y-1">
                    {item.children.map((child) => {
                      const childActive = isActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors min-h-[40px] ${
                            childActive
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </li>
              );
            }

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors min-h-[44px] ${
                    active
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 pl-2'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
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
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide-in */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-600 truncate">Welcome to Case Presenter</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
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