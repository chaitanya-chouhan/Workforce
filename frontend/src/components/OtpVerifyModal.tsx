import React, { useState } from 'react';
import { KeyRound, ShieldCheck, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface OtpVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  requestTitle?: string;
  customerName?: string;
  onConfirmed: () => void;
}

export const OtpVerifyModal: React.FC<OtpVerifyModalProps> = ({
  isOpen,
  onClose,
  requestId,
  requestTitle = 'Service Request',
  customerName = 'Customer',
  onConfirmed,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit numeric OTP provided by the customer.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.verifyAssignmentOtp(requestId, otp.trim());
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onConfirmed();
          onClose();
        }, 1500);
      } else {
        setError(res.error || 'Failed to verify assignment OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <h3 className="font-bold text-lg text-[#E7EAEE]">Confirm Job Assignment</h3>
          <p className="text-xs text-[#8A94A6] mt-1">Enter Customer's 6-Digit OTP</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-[#090B0E] rounded-xl p-3 border border-[#272D34] text-center space-y-0.5">
            <span className="text-[10px] text-[#8A94A6] uppercase tracking-wider font-semibold">Service Request</span>
            <p className="font-bold text-xs text-[#E7EAEE] truncate">{requestTitle}</p>
            <p className="text-[11px] text-[#8A94A6]">Customer: {customerName}</p>
          </div>

          {success ? (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-sm text-emerald-300">Assignment Confirmed!</h4>
              <p className="text-xs text-emerald-400/80">
                Job locked successfully. You are now the assigned provider.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8A94A6] mb-1.5 text-center">
                  Enter 6-Digit Assignment OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="------"
                  className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 rounded-xl bg-[#090B0E] border border-[#272D34] text-[#FF6A00] focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all placeholder:text-[#353D47]"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-xs text-red-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-[#272D34]/40 rounded-xl p-3 text-[11px] text-[#8A94A6] flex items-start space-x-2 border border-[#272D34]">
                <ShieldCheck className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
                <span>
                  Ask the customer for the code displayed on their screen. Maximum 5 verification attempts permitted.
                </span>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[#272D34] text-[#E7EAEE] text-xs font-semibold hover:bg-[#272D34] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#FF9A3C] disabled:opacity-40 text-black text-xs font-semibold transition-all shadow-sm"
                >
                  {loading ? 'Verifying OTP...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyModal;
