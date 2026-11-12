import React, { useState } from 'react';
import { api } from '../services/api';
import { AlertCircle, CheckCircle2, ShieldAlert, Upload, X } from 'lucide-react';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  targetRole: 'WORKER' | 'CUSTOMER';
  requestId?: string;
  onSubmitted?: () => void;
}

const CATEGORIES = [
  { value: 'POOR_BEHAVIOR', label: 'Unprofessional or Abusive Behavior' },
  { value: 'NO_SHOW', label: 'No Show / Unannounced Absence' },
  { value: 'UNSAFE_PRACTICE', label: 'Safety Violation or Hazard' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Dispute / Non-payment' },
  { value: 'OVERCHARGING', label: 'Overcharging / Unagreed Demands' },
  { value: 'PROPERTY_DAMAGE', label: 'Damage to Property or Fixtures' },
  { value: 'FRAUD', label: 'Fraud or False Representation' },
  { value: 'OTHER', label: 'Other Issue' },
];

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  targetRole,
  requestId,
  onSubmitted,
}) => {
  const [category, setCategory] = useState('POOR_BEHAVIOR');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        setError('Evidence file must be smaller than 5 MB.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide a subject and detailed description.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('targetUserId', targetUserId);
      formData.append('targetRole', targetRole);
      if (requestId) {
        formData.append('requestId', requestId);
      }
      formData.append('category', category);
      formData.append('subject', subject.trim());
      formData.append('description', description.trim());
      if (file) {
        formData.append('evidence', file);
      }

      const res = await api.submitComplaint(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onSubmitted?.();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#171B20] w-full max-w-lg rounded-3xl shadow-2xl border border-[#272D34] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#090B0E] border-b border-[#272D34] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#E7EAEE]">
                File a Complaint against {targetRole === 'WORKER' ? 'Worker' : 'Customer'}
              </h3>
              <p className="text-[11px] text-[#8A94A6]">Target: <span className="text-[#E7EAEE] font-medium">{targetUserName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8A94A6] hover:text-[#E7EAEE] hover:bg-[#171B20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#E7EAEE]">Complaint Submitted Successfully</h4>
              <p className="text-xs text-[#8A94A6] max-w-sm mx-auto">
                Your report has been received and escalated to our administrator moderation queue for review.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-xs text-red-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#8A94A6] mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#272D34] focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none bg-[#090B0E] text-[#E7EAEE] font-medium"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value} className="bg-[#171B20] text-[#E7EAEE]">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8A94A6] mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Summary of incident..."
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#272D34] focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none bg-[#090B0E] text-[#E7EAEE] placeholder:text-[#657080]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8A94A6] mb-1">
                  Detailed Explanation
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe exactly what happened with dates, specifics, and any agreements breached..."
                  className="w-full text-xs p-3 rounded-xl border border-[#272D34] focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none bg-[#090B0E] text-[#E7EAEE] placeholder:text-[#657080]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8A94A6] mb-1">
                  Attach Evidence (Optional, &le;5MB JPEG/PNG/PDF)
                </label>
                <label className="border border-dashed border-[#272D34] hover:border-[#FF6A00]/50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-[#090B0E] transition-colors">
                  <Upload className="w-4 h-4 text-[#FF6A00] mb-1" />
                  <span className="text-xs text-[#E7EAEE] text-center font-medium">
                    {file ? file.name : 'Upload supporting photo or document'}
                  </span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-[#657080] mt-1">
                  Evidence is stored in private, access-controlled storage and only visible to administrators.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#272D34]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8A94A6] hover:text-[#E7EAEE] hover:bg-[#272D34] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all"
                >
                  {loading ? 'Submitting Report...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintModal;
