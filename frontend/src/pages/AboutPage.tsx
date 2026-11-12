import React from 'react';
import { Shield, Lock, Server } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 bg-[#090B0E] text-[#E7EAEE]">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF9A3C] bg-[#171B20] border border-[#FF6A00]/30 px-3 py-1 rounded-full">
          Architecture & Engineering
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-[#E7EAEE] tracking-tight">
          About WorkForce Platform
        </h1>
        <p className="text-[#8A94A6] text-sm sm:text-base leading-relaxed">
          Designed as a production-grade full-stack platform leveraging Google Gemma and Firebase Spark to empower local communities with honest, accessible technology.
        </p>
      </div>

      {/* Key Architectural Decisions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 shadow-lg space-y-3 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#090B0E] border border-[#272D34] text-[#FF6A00] flex items-center justify-center font-bold">
            <Server className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#E7EAEE]">Zero Cloud Storage Bill</h4>
          <p className="text-xs text-[#8A94A6] leading-relaxed">
            Uploaded images are held in server memory (Multer memoryStorage) only for the duration of the Gemma 4 API call. They are deleted immediately without requiring paid Firebase Storage plans.
          </p>
        </div>

        <div className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 shadow-lg space-y-3 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#090B0E] border border-[#272D34] text-amber-400 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#E7EAEE]">Deterministic Safety First</h4>
          <p className="text-xs text-[#8A94A6] leading-relaxed">
            Because AI models cannot be trusted with life-critical decisions alone, a conservative regex safety engine intercepts gas leaks, live sparks, and structural cracks before model outputs are rendered.
          </p>
        </div>

        <div className="bg-[#171B20] border border-[#272D34] hover:border-[#353D47] rounded-2xl p-6 shadow-lg space-y-3 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#090B0E] border border-[#272D34] text-emerald-400 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#E7EAEE]">Cryptographic OTP Hashes</h4>
          <p className="text-xs text-[#8A94A6] leading-relaxed">
            Assignment OTPs are generated on the server using cryptographically secure random integers. Only salted SHA-256 hashes are written to Firestore, safeguarding against client leakage.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
