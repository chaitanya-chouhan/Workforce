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
      className={`rounded-2xl p-5 border shadow-lg ${
        isEmergency
          ? 'bg-red-950/40 border-red-500/80 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
          : isHigh
          ? 'bg-[#171B20] border-[#FF6A00] text-[#E7EAEE] shadow-[0_0_20px_rgba(255,106,0,0.2)]'
          : 'bg-[#171B20] border-[#272D34] text-[#E7EAEE]'
      }`}
    >
      <div className="flex items-start space-x-3.5">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            isEmergency
              ? 'bg-red-600 text-white'
              : isHigh
              ? 'bg-[#FF6A00] text-black shadow-[0_0_12px_rgba(255,106,0,0.4)]'
              : 'bg-[#272D34] text-[#FF9A3C]'
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
              <h3 className="font-bold text-base tracking-tight text-[#E7EAEE]">
                {isEmergency
                  ? 'CRITICAL SAFETY HAZARD DETECTED'
                  : isHigh
                  ? 'High-Risk Issue — Professional Inspection Required'
                  : 'Safety Notice'}
              </h3>
              <span
                className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md ${
                  isEmergency
                    ? 'bg-red-900/60 text-red-200 border border-red-700'
                    : isHigh
                    ? 'bg-[#FF6A00]/20 text-[#FF9A3C] border border-[#FF6A00]/40'
                    : 'bg-[#272D34] text-[#8A94A6] border border-[#353D47]'
                }`}
              >
                Severity: {severity}
              </span>
            </div>
            <p className="text-xs text-[#8A94A6] mt-1 leading-relaxed">
              {isDangerous
                ? 'Deterministic backend safety gates have identified potential danger. DIY disassembly is strictly disabled to prevent injury or property damage.'
                : 'Please review general safety precautions before inspecting.'}
            </p>
          </div>

          {/* Safety Warnings List */}
          {safetyWarnings.length > 0 && (
            <div className="space-y-1.5 bg-[#090B0E] rounded-xl p-3 border border-[#272D34]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9A3C] block">
                Required Precautionary Measures:
              </span>
              <ul className="space-y-1 text-xs text-[#E7EAEE]">
                {safetyWarnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-[#FF6A00] font-bold">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* DIY Eligibility Banner */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-xl border ${
                diyEligibility === 'not_allowed'
                  ? 'bg-red-950/60 border-red-800/60 text-red-300'
                  : diyEligibility === 'limited'
                  ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
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
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-xl bg-[#272D34] border border-[#FF6A00]/30 text-[#FF9A3C]">
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
