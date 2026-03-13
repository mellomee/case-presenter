import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Scale, LayoutDashboard, FileText, Users, BookOpen, Tv, Settings } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/Dashboard', icon: LayoutDashboard },
    { label: 'Proof Vault', path: '/ProofVault', icon: FileText },
    { label: 'Parties', path: '/Parties', icon: Users },
    { label: 'Exam Builder', path: '/ExamBuilder', icon: BookOpen },
    { label: 'Present', path: '/present/attorney', icon: Tv },
    { label: 'Settings', path: '/Settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

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
              U
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}