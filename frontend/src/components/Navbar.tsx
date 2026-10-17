import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Shield, LogOut, User as UserIcon, AlertTriangle, Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell';

export const Navbar: React.FC = () => {
  const { user, logout, firebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'WORKER') return '/worker';
    return '/customer';
  };

  const closeMenu = () => setMobileMenuOpen(false);

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
        <Link to="/" onClick={closeMenu} className="flex items-center space-x-2.5 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">WorkForce</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                Gemma 4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block">AI-Powered Local Service Platform</p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
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

        {/* User / Auth Controls & Mobile Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <NotificationBell />

              <Link
                to={getDashboardPath()}
                onClick={closeMenu}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-medium transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.name}</span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-600 text-white">
                  {user.role}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors hidden sm:block"
                title="Log out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2.5">
              <Link
                to="/login"
                className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <Link
              to="/"
              onClick={closeMenu}
              className={`p-2 rounded-lg hover:bg-slate-100 ${location.pathname === '/' ? 'text-brand-600 font-bold bg-brand-50' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/how-it-works"
              onClick={closeMenu}
              className={`p-2 rounded-lg hover:bg-slate-100 ${location.pathname === '/how-it-works' ? 'text-brand-600 font-bold bg-brand-50' : ''}`}
            >
              How It Works
            </Link>
            <Link
              to="/about"
              onClick={closeMenu}
              className={`p-2 rounded-lg hover:bg-slate-100 ${location.pathname === '/about' ? 'text-brand-600 font-bold bg-brand-50' : ''}`}
            >
              About
            </Link>
            {user && (
              <Link
                to={getDashboardPath()}
                onClick={closeMenu}
                className={`p-2 rounded-lg hover:bg-slate-100 ${location.pathname === getDashboardPath() ? 'text-brand-600 font-bold bg-brand-50' : ''}`}
              >
                Dashboard ({user.role})
              </Link>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out ({user.name})</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="text-center py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="text-center py-2 text-sm font-medium text-white bg-brand-600 rounded-xl"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
