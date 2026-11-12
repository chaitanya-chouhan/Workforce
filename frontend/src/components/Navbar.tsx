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
    <header className="sticky top-0 z-40 bg-[#090B0E]/95 backdrop-blur-md border-b border-[#272D34]">
      {!firebaseConfigured && (
        <div className="bg-[#FF6A00]/20 border-b border-[#FF6A00]/30 text-[#FF9A3C] text-xs px-4 py-1.5 flex items-center justify-center space-x-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Firebase configuration required. Please update <code>frontend/.env</code> with your Firebase Web App credentials.
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link to="/" onClick={closeMenu} className="flex items-center space-x-2 group shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FF6A00] flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,106,0,0.3)] group-hover:scale-105 transition-transform shrink-0">
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base sm:text-xl text-[#E7EAEE] tracking-tight block">WorkForce</span>
            <p className="text-[11px] text-[#8A94A6] -mt-0.5 hidden sm:block">AI-Powered Local Service Platform</p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-[#8A94A6]">
          <Link
            to="/"
            className={`transition-colors hover:text-[#FF6A00] ${location.pathname === '/' ? 'text-[#FF6A00] font-semibold' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/how-it-works"
            className={`transition-colors hover:text-[#FF6A00] ${location.pathname === '/how-it-works' ? 'text-[#FF6A00] font-semibold' : ''}`}
          >
            How It Works
          </Link>
          <Link
            to="/about"
            className={`transition-colors hover:text-[#FF6A00] ${location.pathname === '/about' ? 'text-[#FF6A00] font-semibold' : ''}`}
          >
            About
          </Link>
          {user && (
            <Link
              to={getDashboardPath()}
              className="text-[#FF6A00] font-semibold hover:text-[#FF9A3C] transition-colors flex items-center space-x-1"
            >
              <span>Dashboard</span>
            </Link>
          )}
        </nav>

        {/* User / Auth Controls & Mobile Toggle */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0 min-w-0">
          {user ? (
            <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
              <NotificationBell />

              <Link
                to={getDashboardPath()}
                onClick={closeMenu}
                className="flex items-center space-x-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-[#171B20] hover:bg-[#272D34] border border-[#272D34] text-[#E7EAEE] text-xs sm:text-sm font-medium transition-colors max-w-[220px]"
                title={user.name}
              >
                <UserIcon className="w-3.5 h-3.5 text-[#8A94A6] shrink-0" />
                {/* Full name when enough space is available (sm screens and up), initial when space is limited (mobile) */}
                <span className="hidden sm:inline whitespace-nowrap text-xs sm:text-sm">
                  {user.name}
                </span>
                <span className="sm:hidden font-bold uppercase text-xs text-[#FF6A00]">
                  {user.name ? user.name.charAt(0) : 'U'}
                </span>
                <span className="text-[8px] sm:text-[10px] font-bold uppercase px-1 py-0.5 rounded bg-[#FF6A00] text-black shrink-0 leading-none">
                  {user.role}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-[#8A94A6] hover:text-red-400 rounded-xl hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-colors hidden sm:block shrink-0"
                title="Log out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1 sm:space-x-2.5">
              <Link
                to="/login"
                className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-medium text-[#E7EAEE] hover:text-[#FF6A00] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-black bg-[#FF6A00] hover:bg-[#FF9A3C] rounded-xl shadow-[0_0_15px_rgba(255,106,0,0.25)] transition-all whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-[#8A94A6] hover:text-[#E7EAEE] hover:bg-[#171B20] border border-[#272D34] transition-colors shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#272D34] bg-[#171B20] px-4 py-4 space-y-3 shadow-2xl">
          <div className="flex flex-col space-y-1 text-sm font-medium text-[#E7EAEE]">
            <Link
              to="/"
              onClick={closeMenu}
              className={`p-2.5 rounded-xl hover:bg-[#272D34] transition-colors ${location.pathname === '/' ? 'text-[#FF6A00] font-bold bg-[#272D34]/50' : 'text-[#8A94A6]'}`}
            >
              Home
            </Link>
            <Link
              to="/how-it-works"
              onClick={closeMenu}
              className={`p-2.5 rounded-xl hover:bg-[#272D34] transition-colors ${location.pathname === '/how-it-works' ? 'text-[#FF6A00] font-bold bg-[#272D34]/50' : 'text-[#8A94A6]'}`}
            >
              How It Works
            </Link>
            <Link
              to="/about"
              onClick={closeMenu}
              className={`p-2.5 rounded-xl hover:bg-[#272D34] transition-colors ${location.pathname === '/about' ? 'text-[#FF6A00] font-bold bg-[#272D34]/50' : 'text-[#8A94A6]'}`}
            >
              About
            </Link>
            {user && (
              <Link
                to={getDashboardPath()}
                onClick={closeMenu}
                className={`p-2.5 rounded-xl hover:bg-[#272D34] transition-colors ${location.pathname === getDashboardPath() ? 'text-[#FF6A00] font-bold bg-[#272D34]/50' : 'text-[#8A94A6]'}`}
              >
                Dashboard ({user.role})
              </Link>
            )}
          </div>

          <div className="border-t border-[#272D34] pt-3">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold text-red-400 bg-red-950/30 border border-red-900/40 hover:bg-red-950/60 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out ({user.name})</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="text-center py-2 text-xs font-medium text-[#E7EAEE] bg-[#272D34] border border-[#353D47] rounded-xl hover:bg-[#353D47]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="text-center py-2 text-xs font-semibold text-black bg-[#FF6A00] hover:bg-[#FF9A3C] rounded-xl"
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
