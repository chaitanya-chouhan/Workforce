import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  KeyRound,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Search,
  Droplet,
  Zap,
  Hammer,
  Paintbrush,
  Tv,
} from 'lucide-react';

const COMMON_PROBLEMS = [
  { icon: Droplet, label: 'A leaking tap or pipe', category: 'Plumbing', color: 'text-blue-500 bg-blue-50' },
  { icon: Zap, label: 'Ceiling fan or switch sparking', category: 'Electrical', color: 'text-amber-500 bg-amber-50' },
  { icon: Hammer, label: 'Damaged wooden door or hinge', category: 'Carpentry', color: 'text-orange-500 bg-orange-50' },
  { icon: Tv, label: 'Washing machine or fridge fault', category: 'Appliance', color: 'text-purple-500 bg-purple-50' },
  { icon: Paintbrush, label: 'Damp wall touchup & painting', category: 'Painting', color: 'text-emerald-500 bg-emerald-50' },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-20 pb-20 bg-[#090B0E] text-[#E7EAEE]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-[#272D34]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#171B20] border border-[#272D34] text-[#FF9A3C] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Powered by Google Gemma 4 & Firebase</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#E7EAEE] tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Intelligent Household Help,{' '}
            <span className="text-[#FF6A00]">
              Verified Local Workers
            </span>
          </h1>

          <p className="text-[#8A94A6] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Describe your household repair in ordinary language or upload a photo. Gemma 4 interprets the problem, checks safety hazards, and matches you with available local technicians confirmed via customer-generated OTP.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#FF6A00] hover:bg-[#FF9A3C] text-black font-semibold text-sm rounded-xl shadow-[0_0_20px_rgba(255,106,0,0.25)] flex items-center justify-center space-x-2 transition-all hover:-translate-y-0.5"
            >
              <span>Submit a Problem</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#171B20] hover:bg-[#272D34] text-[#E7EAEE] border border-[#272D34] font-semibold text-sm rounded-xl transition-all"
            >
              How WorkForce Works
            </Link>
          </div>

          {/* Quick Problem Pills */}
          <div className="pt-8">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#8A94A6] block mb-3">
              Common Household Issues Supported
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
              {COMMON_PROBLEMS.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <Link
                    key={idx}
                    to="/register"
                    className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#171B20] border border-[#272D34] hover:border-[#FF6A00]/50 hover:bg-[#272D34] text-xs font-medium text-[#E7EAEE] transition-all"
                  >
                    <div className="p-1 rounded-md bg-[#272D34] text-[#FF9A3C]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span>{p.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#E7EAEE] tracking-tight">
            Built on Real AI and Cryptographic Verification
          </h2>
          <p className="text-[#8A94A6] text-sm max-w-xl mx-auto">
            No mockups or disconnected frontends. WorkForce delivers an authentic, end-to-end service ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#090B0E] border border-[#272D34] text-[#FF6A00] flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#E7EAEE]">Gemma 4 Diagnostics</h3>
            <p className="text-xs text-[#8A94A6] leading-relaxed">
              Official `@google/genai` integration interprets text and images to surface preliminary causes, observations, uncertainty, and trade recommendations.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#090B0E] border border-[#272D34] text-amber-400 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#E7EAEE]">Deterministic Safety Gate</h3>
            <p className="text-xs text-[#8A94A6] leading-relaxed">
              Immediate emergency escalation for suspected gas leaks, live electrical sparks, and structural failure. Restricts hazardous DIY repairs automatically.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#090B0E] border border-[#272D34] text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#E7EAEE]">Customer-Generated OTP</h3>
            <p className="text-xs text-[#8A94A6] leading-relaxed">
              Customers generate a 6-digit OTP. The worker confirms assignment by entering it on their screen. Handled atomically via Firestore transactions.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#090B0E] border border-[#272D34] text-[#FF9A3C] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#E7EAEE]">Transparent Rate Cards</h3>
            <p className="text-xs text-[#8A94A6] leading-relaxed">
              Configurable Firestore rate cards provide honest labour, travel, and material ranges formatted in INR with realistic disclaimers.
            </p>
          </div>
        </div>
      </section>

      {/* Worker Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#171B20] border border-[#272D34] rounded-2xl p-8 sm:p-12 text-[#E7EAEE] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF6A00]">For Service Providers</span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[#E7EAEE]">
              Are you a local plumber, electrician, or carpenter?
            </h3>
            <p className="text-xs sm:text-sm text-[#8A94A6] leading-relaxed">
              Toggle your availability with one click. Browse open household problems with AI diagnostic briefs, express interest, and confirm verified jobs via OTP.
            </p>
          </div>
          <Link
            to="/register"
            className="px-8 py-3.5 bg-[#FF6A00] hover:bg-[#FF9A3C] text-black font-semibold text-sm rounded-xl shadow-[0_0_15px_rgba(255,106,0,0.3)] transition-all shrink-0 hover:scale-105"
          >
            Register as a Worker
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
