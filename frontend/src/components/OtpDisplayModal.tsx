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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#171B20] rounded-3xl max-w-md w-full shadow-2xl border border-[#272D34] overflow-hidden">
        {/* Header */}
        <div className="bg-[#090B0E] border-b border-[#272D34] p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#8A94A6] hover:text-[#E7EAEE] p-1.5 rounded-xl hover:bg-[#171B20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A00] flex items-center justify-center mx-auto mb-3 text-black shadow-[0_0_15px_rgba(255,106,0,0.3)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-[#E7EAEE]">Assignment Confirmation OTP</h3>
          <p className="text-xs text-[#8A94A6] mt-1">Communicate this code to your worker</p>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-5">
          <div className="space-y-1">
            <p className="text-xs text-[#8A94A6]">Worker Assigned</p>
            <p className="font-bold text-sm text-[#E7EAEE]">{workerName}</p>
            <p className="text-[11px] text-[#8A94A6] truncate">For: "{requestTitle}"</p>
          </div>

          {/* 6-Digit OTP Big Box */}
          <div className="bg-[#090B0E] border border-[#FF6A00]/40 rounded-2xl p-5 flex items-center justify-center space-x-2.5 shadow-inner">
            {otp.split('').map((digit, idx) => (
              <span
                key={idx}
                className="w-10 h-12 sm:w-11 sm:h-13 flex items-center justify-center text-2xl sm:text-3xl font-black text-[#FF6A00] bg-[#171B20] rounded-xl shadow-sm border border-[#272D34]"
              >
                {digit}
              </span>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl bg-[#272D34] hover:bg-[#353D47] border border-[#353D47] text-[#E7EAEE] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#8A94A6]" />
                <span>Copy 6-Digit Code</span>
              </>
            )}
          </button>

          {/* Expiration Notice */}
          <div className="flex items-center justify-center space-x-2 text-xs">
            <Clock className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-[#8A94A6]'}`} />
            {isExpired ? (
              <span className="text-red-400 font-bold">This OTP has expired. Please generate a new one.</span>
            ) : (
              <span className="text-[#8A94A6]">
                Expires in{' '}
                <span className="font-bold text-[#FF9A3C]">
                  {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                </span>
              </span>
            )}
          </div>

          {/* Verification Workflow Explanation */}
          <div className="bg-[#272D34]/40 border border-[#272D34] rounded-xl p-3 text-[11px] text-[#8A94A6] leading-relaxed text-left flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
            <span>
              Share this code verbally or by phone. The worker will enter it on their dashboard to securely lock and confirm the assignment.
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#FF6A00] hover:bg-[#FF9A3C] text-black font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpDisplayModal;
