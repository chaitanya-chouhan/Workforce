import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, Database, Lock, Server, Cpu, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const AboutPage: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    api.checkHealth()
      .then(res => setHealthData(res))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
          Architecture & Engineering
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          About WorkForce Platform
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Designed as a production-grade full-stack platform leveraging Google Gemma 4 and Firebase Spark to empower local communities with honest, accessible technology.
        </p>
      </div>

      {/* Live System Diagnostics Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <Cpu className="w-6 h-6 text-brand-400" />
            <div>
              <h3 className="font-bold text-base">Backend & AI Health Diagnostics</h3>
              <p className="text-xs text-slate-400">Live configuration status from Express API</p>
            </div>
          </div>
          <span
            className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
              healthData?.status === 'HEALTHY'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {healthData?.status || 'CHECKING...'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 border border-slate-700/50">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block">
              Gemma 4 AI Model
            </span>
            <p className="font-mono text-sm text-brand-300">
              {healthData?.ai?.configuredModel || 'gemma-4-26b-a4b-it'}
            </p>
            <p className="text-slate-400">
              {healthData?.ai?.verification?.message || healthData?.ai?.note || 'Verifying API status...'}
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 space-y-2 border border-slate-700/50">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block">
              Cloud Firestore & Firebase Admin
            </span>
            <p className="font-mono text-sm text-emerald-300">
              {healthData?.firebase?.firestoreWorking ? 'Connected (Asia-South1)' : 'Configuration Pending'}
            </p>
            <p className="text-slate-400">
              {healthData?.firebase?.message || 'Awaiting serviceAccountKey.json placement'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Architectural Decisions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Server className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900">Zero Cloud Storage Bill</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Uploaded images are held in server memory (Multer memoryStorage) only for the duration of the Gemma 4 API call. They are deleted immediately without requiring paid Firebase Storage plans.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900">Deterministic Safety First</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Because AI models cannot be trusted with life-critical decisions alone, a conservative regex safety engine intercepts gas leaks, live sparks, and structural cracks before model outputs are rendered.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900">Cryptographic OTP Hashes</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Assignment OTPs are generated on the server using cryptographically secure random integers. Only salted SHA-256 hashes are written to Firestore, safeguarding against client leakage.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
