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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-950">
                File a Complaint against {targetRole === 'WORKER' ? 'Worker' : 'Customer'}
              </h3>
              <p className="text-[11px] text-red-700">Target: {targetUserName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Complaint Submitted Successfully</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your report has been received and escalated to our administrator moderation queue for review.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 outline-none bg-white font-medium"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Summary of incident..."
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Explanation
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe exactly what happened with dates, specifics, and any agreements breached..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Evidence (Optional, &le;5MB JPEG/PNG/PDF)
                </label>
                <label className="border-2 border-dashed border-slate-300 hover:border-red-400 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-colors">
                  <Upload className="w-4 h-4 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-600 text-center font-medium">
                    {file ? file.name : 'Upload supporting photo or document'}
                  </span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  Evidence is stored in private, access-controlled storage and only visible to administrators.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
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
