import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Shield, LogOut, User as UserIcon, AlertTriangle } from 'lucide-react';
import NotificationBell from './NotificationBell';

export const Navbar: React.FC = () => {
  const { user, logout, firebaseConfigured } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'WORKER') return '/worker';
    return '/customer';
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {!firebaseConfigured && (
        <div className="bg-amber-500 text-white text-xs px-4 py-1.5 flex items-center justify-center space-x-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Firebase configuration required. Please update <code>frontend/.env</code> with your Firebase Web App credentials.
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xl text-slate-900 tracking-tight">WorkForce</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                Gemma 4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block">AI-Powered Local Service Platform</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <Link to="/how-it-works" className="hover:text-brand-600 transition-colors">How It Works</Link>
          <Link to="/about" className="hover:text-brand-600 transition-colors">About</Link>
          {user && (
            <Link
              to={getDashboardPath()}
              className="text-brand-600 font-semibold hover:text-brand-700 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* User / Auth Controls */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <NotificationBell />

              <Link
                to={getDashboardPath()}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium transition-colors"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span className="max-w-[120px] truncate">{user.name}</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-600 text-white">
                  {user.role}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
