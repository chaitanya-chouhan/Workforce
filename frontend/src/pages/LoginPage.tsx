import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Shield, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, firebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminLogin = location.pathname.includes('/admin');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'WORKER') {
        navigate('/worker', { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    } catch (err: any) {
      console.error('[Login Error]', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please reset your password or try again later.');
      } else {
        setError(err.message || 'Login failed. Please verify your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#090B0E]">
      <div className="max-w-md w-full bg-[#171B20] rounded-3xl shadow-2xl border border-[#272D34] p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-black mx-auto shadow-[0_0_15px_rgba(255,106,0,0.3)] bg-[#FF6A00]">
            {isAdminLogin ? <Shield className="w-6 h-6 text-black" /> : <Wrench className="w-6 h-6 text-black" />}
          </div>
          <h2 className="text-2xl font-black text-[#E7EAEE] tracking-tight">
            {isAdminLogin ? 'Administrator Console' : 'Sign in to WorkForce'}
          </h2>
          <p className="text-xs text-[#8A94A6]">
            {isAdminLogin
              ? 'Authorized personnel only — identity compliance and governance'
              : 'Access your customer or service provider portal'}
          </p>
        </div>

        {!firebaseConfigured && (
          <div className="bg-[#272D34]/50 border border-[#FF6A00]/30 rounded-xl p-3 text-xs text-[#FF9A3C] space-y-1">
            <p className="font-semibold flex items-center">
              <AlertCircle className="w-4 h-4 mr-1 text-[#FF6A00] shrink-0" />
              Firebase Setup Notice:
            </p>
            <p className="text-[11px] text-[#8A94A6] leading-relaxed">
              Please paste your Firebase Web App configuration values into <code>frontend/.env</code> to authenticate live accounts.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-xs text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8A94A6] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#657080] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-[#090B0E] border border-[#272D34] text-[#E7EAEE] focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all placeholder:text-[#657080]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A94A6] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#657080] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-[#090B0E] border border-[#272D34] text-[#E7EAEE] focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all placeholder:text-[#657080]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#FF6A00] hover:bg-[#FF9A3C] disabled:opacity-40 text-black font-semibold text-xs rounded-xl shadow-[0_0_15px_rgba(255,106,0,0.25)] transition-all flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-[#8A94A6]">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-[#FF9A3C] hover:text-[#FF6A00] hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
