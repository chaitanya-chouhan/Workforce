import React, { useState, useEffect } from 'react';
import { KeyRound, Copy, Check, Clock, ShieldCheck, X } from 'lucide-react';

interface OtpDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  otp: string;
  expiresAt: string;
  workerName?: string;
  requestTitle?: string;
}

export const OtpDisplayModal: React.FC<OtpDisplayModalProps> = ({
  isOpen,
  onClose,
  otp,
  expiresAt,
  workerName = 'Selected Worker',
  requestTitle = 'Service Request',
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 min default in seconds

  useEffect(() => {
    if (!expiresAt) return;
    const calculateRemaining = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-lg">Assignment Confirmation OTP</h3>
          <p className="text-xs text-white/80 mt-1">Communicate this code to your worker</p>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-5">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Worker Assigned</p>
            <p className="font-bold text-sm text-slate-900">{workerName}</p>
            <p className="text-[11px] text-slate-400 truncate">For: "{requestTitle}"</p>
          </div>

          {/* 6-Digit OTP Big Box */}
          <div className="bg-slate-50 border-2 border-brand-500/30 rounded-2xl p-5 flex items-center justify-center space-x-3 shadow-inner">
            {otp.split('').map((digit, idx) => (
              <span
                key={idx}
                className="w-11 h-13 flex items-center justify-center text-3xl font-black text-brand-700 bg-white rounded-xl shadow-sm border border-slate-200"
              >
                {digit}
              </span>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy 6-Digit Code</span>
              </>
            )}
          </button>

          {/* Expiration Notice */}
          <div className="flex items-center justify-center space-x-2 text-xs">
            <Clock className={`w-4 h-4 ${isExpired ? 'text-red-500' : 'text-slate-400'}`} />
            {isExpired ? (
              <span className="text-red-600 font-bold">This OTP has expired. Please generate a new one.</span>
            ) : (
              <span className="text-slate-500">
                Expires in{' '}
                <span className="font-bold text-brand-600">
                  {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                </span>
              </span>
            )}
          </div>

          {/* Verification Workflow Explanation */}
          <div className="bg-brand-50/50 border border-brand-100 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed text-left flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <span>
              Share this code verbally or by phone. The worker will enter it on their dashboard to securely lock and confirm the assignment.
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpDisplayModal;
