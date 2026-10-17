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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-lg">Confirm Job Assignment</h3>
          <p className="text-xs text-white/80 mt-1">Enter Customer's 6-Digit OTP</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Service Request</span>
            <p className="font-bold text-xs text-slate-800 truncate">{requestTitle}</p>
            <p className="text-[11px] text-slate-500">Customer: {customerName}</p>
          </div>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm text-emerald-900">Assignment Confirmed!</h4>
              <p className="text-xs text-emerald-700">
                Job locked successfully. You are now the assigned provider.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit Assignment OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="------"
                  className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Ask the customer for the code displayed on their screen. Maximum 5 verification attempts permitted.
                </span>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-600/20"
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
