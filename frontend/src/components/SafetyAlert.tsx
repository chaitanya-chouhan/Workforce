import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface SafetyAlertProps {
  severity: 'low' | 'medium' | 'high' | 'emergency';
  safetyWarnings?: string[];
  basicChecks?: string[];
  diyEligibility?: 'allowed' | 'limited' | 'not_allowed';
  requiresProfessional?: boolean;
}

export const SafetyAlert: React.FC<SafetyAlertProps> = ({
  severity,
  safetyWarnings = [],
  basicChecks = [],
  diyEligibility = 'allowed',
  requiresProfessional = false,
}) => {
  const isEmergency = severity === 'emergency';
  const isHigh = severity === 'high';
  const isDangerous = isEmergency || isHigh;

  if (!isDangerous && safetyWarnings.length === 0) return null;

  return (
    <div
      className={`rounded-2xl p-5 border-2 shadow-sm ${
        isEmergency
          ? 'bg-red-50 border-red-500 text-red-950'
          : isHigh
          ? 'bg-amber-50 border-amber-500 text-amber-950'
          : 'bg-blue-50 border-blue-200 text-blue-950'
      }`}
    >
      <div className="flex items-start space-x-3.5">
        <div
          className={`p-2.5 rounded-xl text-white shrink-0 ${
            isEmergency ? 'bg-red-600' : isHigh ? 'bg-amber-600' : 'bg-blue-600'
          }`}
        >
          {isEmergency ? (
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          ) : isHigh ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <ShieldAlert className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base tracking-tight">
                {isEmergency
                  ? 'CRITICAL SAFETY HAZARD DETECTED'
                  : isHigh
                  ? 'High-Risk Issue — Professional Inspection Required'
                  : 'Safety Notice'}
              </h3>
              <span
                className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                  isEmergency
                    ? 'bg-red-200 text-red-800'
                    : isHigh
                    ? 'bg-amber-200 text-amber-800'
                    : 'bg-blue-200 text-blue-800'
                }`}
              >
                Severity: {severity}
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              {isDangerous
                ? 'Deterministic backend safety gates have identified potential danger. DIY disassembly is strictly disabled to prevent injury or property damage.'
                : 'Please review general safety precautions before inspecting.'}
            </p>
          </div>

          {/* Safety Warnings List */}
          {safetyWarnings.length > 0 && (
            <div className="space-y-1.5 bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-slate-200/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Required Precautionary Measures:
              </span>
              <ul className="space-y-1 text-xs text-slate-800">
                {safetyWarnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* DIY Eligibility Banner */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg ${
                diyEligibility === 'not_allowed'
                  ? 'bg-red-100 text-red-700'
                  : diyEligibility === 'limited'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {diyEligibility === 'not_allowed' ? (
                <>
                  <XCircle className="w-3.5 h-3.5 mr-1" /> DIY Disassembly Prohibited
                </>
              ) : diyEligibility === 'limited' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Limited DIY Allowed
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Safe for Visual Check
                </>
              )}
            </span>

            {requiresProfessional && (
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                Licensed Professional Required On-Site
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyAlert;
