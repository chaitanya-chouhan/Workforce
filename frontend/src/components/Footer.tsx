import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Shield, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">WorkForce</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-Powered local service platform connecting households with verified tradespeople using Google Gemma 4 and Firebase.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                <Sparkles className="w-3 h-3 text-amber-400 mr-1" /> Gemma 4
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                <Shield className="w-3 h-3 text-emerald-400 mr-1" /> Firebase Spark
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Gemma 4 & Architecture</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Become a Service Provider</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Request a Household Repair</Link></li>
            </ul>
          </div>

          {/* Supported Services */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Core Trades</h4>
            <ul className="space-y-2.5 text-xs">
              <li>Plumbing & Leak Repairs</li>
              <li>Electrical & Wiring Maintenance</li>
              <li>Carpentry & Door Hardware</li>
              <li>Appliance Repair & Diagnostics</li>
              <li>Masonry, Tiling & Painting</li>
            </ul>
          </div>

          {/* Safety & Legal Disclaimer */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Safety Guarantee</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI diagnoses provided by Gemma 4 are preliminary possibilities, not guaranteed conclusions. Always inspect the problem on site. Suspected gas leaks and active electrical hazards require immediate emergency isolation.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} WorkForce. Built with Firebase and Google Gemma 4.</p>
          <p className="mt-2 sm:mt-0 flex items-center">
            Designed for local community empowerments
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
