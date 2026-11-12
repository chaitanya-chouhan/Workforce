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
    activeClass: 'border-emerald-500 bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500 shadow-sm',
  },
  {
    value: 'good',
    label: 'Good',
    stars: 4,
    emoji: '👍',
    description: 'Well executed, satisfied with job',
    activeClass: 'border-[#FF6A00] bg-[#FF6A00]/20 text-[#FF9A3C] ring-1 ring-[#FF6A00] shadow-sm',
  },
  {
    value: 'ok',
    label: 'OK',
    stars: 3,
    emoji: '👌',
    description: 'Acceptable service, average experience',
    activeClass: 'border-amber-500 bg-amber-950/50 text-amber-300 ring-1 ring-amber-500 shadow-sm',
  },
  {
    value: 'bad',
    label: 'Bad',
    stars: 2,
    emoji: '👎',
    description: 'Subpar work, several issues observed',
    activeClass: 'border-orange-500 bg-orange-950/50 text-orange-300 ring-1 ring-orange-500 shadow-sm',
  },
  {
    value: 'very bad',
    label: 'Very Bad',
    stars: 1,
    emoji: '⚠️',
    description: 'Unacceptable quality or conduct',
    activeClass: 'border-red-500 bg-red-950/50 text-red-300 ring-1 ring-red-500 shadow-sm',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#171B20] rounded-3xl max-w-lg w-full shadow-2xl border border-[#272D34] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#090B0E] border-b border-[#272D34] p-6 text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#8A94A6] hover:text-[#E7EAEE] p-1.5 rounded-xl hover:bg-[#171B20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A00] flex items-center justify-center mx-auto mb-2 text-black shadow-[0_0_15px_rgba(255,106,0,0.3)]">
            <Star className="w-6 h-6 fill-black" />
          </div>
          <h3 className="font-black text-lg tracking-tight text-[#E7EAEE]">Rate Your Service Experience</h3>
          <p className="text-xs text-[#8A94A6]">
            Your review updates the technician's community rating in real time
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="text-center space-y-0.5 border-b border-[#272D34] pb-3">
            <p className="font-extrabold text-sm text-[#E7EAEE]">{displayName}</p>
            <p className="text-xs text-[#8A94A6] truncate">For task: "{requestTitle}"</p>
          </div>

          {success ? (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-6 text-center space-y-2 animate-fadeIn">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-sm text-emerald-300">Review Recorded Successfully!</h4>
              <p className="text-xs text-emerald-400/80">
                Thank you! The worker's average rating has been updated and reflected across WorkForce.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Review Option Selectors (good, bad, ok, very bad, very good) */}
              <div>
                <label className="block text-xs font-bold text-[#E7EAEE] mb-2">
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
                            : 'border-[#272D34] bg-[#090B0E] hover:bg-[#272D34] text-[#8A94A6]'
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
                <p className="text-[11px] text-[#8A94A6] mt-2 text-center">
                  Selected Rating: <strong className="capitalize text-[#FF9A3C]">{currentChoice.label}</strong> ({currentChoice.description})
                </p>
              </div>

              {/* Review Comment (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#8A94A6] mb-1">
                  Comments & Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share details about punctuality, problem resolution, and fairness of charges..."
                  className="w-full text-xs p-3 rounded-2xl bg-[#090B0E] border border-[#272D34] text-[#E7EAEE] focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] outline-none transition-all placeholder:text-[#657080]"
                />
              </div>

              {error && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-3 text-xs text-red-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

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
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#FF9A3C] disabled:opacity-40 text-black text-xs font-bold transition-all shadow-sm"
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
