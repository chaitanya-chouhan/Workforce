import React from 'react';
import {
  FileText,
  Sparkles,
  ShieldAlert,
  Users,
  KeyRound,
  CheckCircle2,
  Star,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    step: '01',
    title: 'Describe Your Household Problem',
    icon: FileText,
    desc: 'Input a brief title, describe what is happening in ordinary conversational language, select urgency, and optionally upload a photo from your phone or desktop.',
    badge: 'Customer Input',
  },
  {
    step: '02',
    title: 'Gemma 4 Multimodal Diagnostic Analysis',
    icon: Sparkles,
    desc: 'The backend calls Gemma 4 through the official @google/genai SDK. It extracts visible symptoms, evaluates likely causes, uncertainty, required trades, and estimates labour/material costs using sample Firestore rate cards.',
    badge: 'AI Diagnostic',
  },
  {
    step: '03',
    title: 'Deterministic Safety Gate',
    icon: ShieldAlert,
    desc: 'If hazardous keywords (gas leak, electrical sparking, structural cracking) are detected, emergency protocols engage automatically. DIY repair instructions are restricted and safety steps are emphasized.',
    badge: 'Safety Escalation',
  },
  {
    step: '04',
    title: 'Worker Discovery & Interest',
    icon: Users,
    desc: 'Available and verified local workers are ranked via transparent multi-factor scoring (skill match, capacity, service area, and ratings). Workers review the AI brief and express interest.',
    badge: 'Transparent Matching',
  },
  {
    step: '05',
    title: 'Customer-Generated OTP Confirmation',
    icon: KeyRound,
    desc: 'The customer generates a cryptographically secure 6-digit OTP and shares it verbally with the chosen worker. The worker enters the code to confirm the assignment atomically in Firestore.',
    badge: 'Cryptographic Lock',
  },
  {
    step: '06',
    title: 'Track Work & Share Feedback',
    icon: Star,
    desc: 'Follow progress through In-Progress to Completion. Once satisfied, the customer confirms completion and leaves a 5-star review that builds community reputation.',
    badge: 'Completion & Trust',
  },
];

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 bg-[#090B0E] text-[#E7EAEE]">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF9A3C] bg-[#171B20] border border-[#FF6A00]/30 px-3 py-1 rounded-full">
          Workflow Architecture
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-[#E7EAEE] tracking-tight">
          How WorkForce Operates
        </h1>
        <p className="text-[#8A94A6] text-sm sm:text-base leading-relaxed">
          From conversational problem interpretation to customer-controlled cryptographic assignment, here is how WorkForce guarantees safety and trust.
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center gap-6 transition-all"
            >
              <div className="flex items-center space-x-4 shrink-0">
                <span className="text-3xl font-black text-[#FF6A00]/40">{s.step}</span>
                <div className="w-12 h-12 rounded-xl bg-[#090B0E] border border-[#272D34] text-[#FF6A00] flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-[#E7EAEE]">{s.title}</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#272D34] text-[#8A94A6] border border-[#353D47]">
                    {s.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#8A94A6] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-8">
        <Link
          to="/register"
          className="inline-flex items-center space-x-2 px-8 py-3.5 bg-[#FF6A00] hover:bg-[#FF9A3C] text-black font-semibold text-sm rounded-xl shadow-[0_0_20px_rgba(255,106,0,0.25)] transition-all"
        >
          <span>Experience WorkForce Today</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default HowItWorksPage;
