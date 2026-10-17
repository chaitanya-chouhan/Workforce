import React, { useState } from 'react';
import { Star, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { ReviewOption } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  requestTitle?: string;
  workerName?: string;
  onSubmitted: () => void;
}

interface ReviewChoice {
  value: ReviewOption;
  label: string;
  stars: number;
  emoji: string;
  description: string;
  activeClass: string;
}

const REVIEW_CHOICES: ReviewChoice[] = [
  {
    value: 'very good',
    label: 'Very Good',
    stars: 5,
    emoji: '🌟',
    description: 'Flawless work & highly professional',
    activeClass: 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500 shadow-sm',
  },
  {
    value: 'good',
    label: 'Good',
    stars: 4,
    emoji: '👍',
    description: 'Well executed, satisfied with job',
    activeClass: 'border-blue-500 bg-blue-50/80 text-blue-950 ring-2 ring-blue-500 shadow-sm',
  },
  {
    value: 'ok',
    label: 'OK',
    stars: 3,
    emoji: '👌',
    description: 'Acceptable service, average experience',
    activeClass: 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500 shadow-sm',
  },
  {
    value: 'bad',
    label: 'Bad',
    stars: 2,
    emoji: '👎',
    description: 'Subpar work, several issues observed',
    activeClass: 'border-orange-500 bg-orange-50/80 text-orange-950 ring-2 ring-orange-500 shadow-sm',
  },
  {
    value: 'very bad',
    label: 'Very Bad',
    stars: 1,
    emoji: '⚠️',
    description: 'Unacceptable quality or conduct',
    activeClass: 'border-red-500 bg-red-50/80 text-red-950 ring-2 ring-red-500 shadow-sm',
  },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  requestId,
  requestTitle = 'Service Request',
  workerName = 'Service Provider',
  onSubmitted,
}) => {
  const [selectedReview, setSelectedReview] = useState<ReviewOption>('good');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Clean raw UID string if passed
  const displayName =
    workerName && workerName.length > 20 && !workerName.includes(' ')
      ? 'Assigned Technician'
      : workerName;

  const currentChoice = REVIEW_CHOICES.find(c => c.value === selectedReview) || REVIEW_CHOICES[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.submitFeedback(requestId, {
        review: selectedReview,
        rating: currentChoice.stars,
        comment: comment.trim() || currentChoice.label,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onSubmitted();
          onClose();
        }, 1600);
      } else {
        setError(res.error || 'Failed to submit feedback.');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <h3 className="font-black text-lg tracking-tight">Rate Your Service Experience</h3>
          <p className="text-xs text-white/90">
            Your review updates the technician's community rating in real time
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="text-center space-y-0.5 border-b border-slate-100 pb-3">
            <p className="font-extrabold text-sm text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">For task: "{requestTitle}"</p>
          </div>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2 animate-fadeIn">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm text-emerald-950">Review Recorded Successfully!</h4>
              <p className="text-xs text-emerald-800">
                Thank you! The worker's average rating has been updated and reflected across WorkForce.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Review Option Selectors (good, bad, ok, very bad, very good) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Select Your Review Rating:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {REVIEW_CHOICES.map(choice => {
                    const isSelected = selectedReview === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => setSelectedReview(choice.value)}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? choice.activeClass
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="text-lg">{choice.emoji}</span>
                        <span className="text-xs font-bold leading-tight capitalize">
                          {choice.label}
                        </span>
                        <div className="flex text-amber-400 scale-75 origin-center">
                          {[...Array(choice.stars)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                  Selected Rating: <strong className="capitalize text-slate-800">{currentChoice.label}</strong> ({currentChoice.description})
                </p>
              </div>

              {/* Review Comment (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comments & Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share details about punctuality, problem resolution, and fairness of charges..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

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
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  {loading ? 'Submitting Review...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
