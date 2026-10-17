import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { WorkerProfile, ServiceRequest, Feedback } from '../types';
import OtpVerifyModal from '../components/OtpVerifyModal';
import SafetyAlert from '../components/SafetyAlert';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  MapPin,
  Play,
  CheckSquare,
  KeyRound,
  Filter,
  AlertCircle,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';

export const WorkerDashboard: React.FC = () => {
  const { user, workerProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(workerProfile);
  const [openTasks, setOpenTasks] = useState<any[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Feedback[]>([]);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals & action states
  const [selectedTaskForOtp, setSelectedTaskForOtp] = useState<any | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<any | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [expressingInterestId, setExpressingInterestId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadWorkerData = async () => {
    try {
      const pRes = await api.getWorkerProfile();
      if (pRes.success) setProfile(pRes.profile);

      const tasksRes = await api.getOpenTasks();
      if (tasksRes.success) setOpenTasks(tasksRes.tasks || []);

      const assignedRes = await api.getAssignedTasks();
      if (assignedRes.success) setAssignedTasks(assignedRes.tasks || []);

      if (user) {
        const fbRes = await api.getWorkerFeedback(user.uid);
        if (fbRes.success) setReviews(fbRes.reviews || []);
      }
    } catch (err: any) {
      console.warn('Error loading worker dashboard:', err);
    }
  };

  useEffect(() => {
    loadWorkerData();
  }, [user]);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    const newStatus = profile.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    setLoading(true);
    try {
      const res = await api.toggleAvailability(newStatus);
      if (res.success) {
        setProfile(prev => (prev ? { ...prev, availabilityStatus: newStatus } : null));
        setSuccessMsg(`Availability updated to ${newStatus}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update availability status.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpressInterest = async (taskId: string) => {
    setLoading(true);
    try {
      const res = await api.expressInterest(taskId, interestMessage || undefined);
      if (res.success) {
        setSuccessMsg('Your interest was sent to the customer!');
        setExpressingInterestId(null);
        setInterestMessage('');
        await loadWorkerData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Could not express interest.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId: string) => {
    setLoading(true);
    try {
      const res = await api.startTask(taskId);
      if (res.success) {
        setSuccessMsg('Task marked In Progress!');
        await loadWorkerData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Could not start task.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setLoading(true);
    try {
      const res = await api.completeTask(taskId);
      if (res.success) {
        setSuccessMsg('Work marked complete! Awaiting customer confirmation.');
        await loadWorkerData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Could not complete task.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = openTasks.filter(t => {
    if (selectedCategory === 'ALL') return true;
    return (t.category || '').toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Worker Profile Header & Availability Toggle */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {user?.name || 'Worker Portal'}
            </h1>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                profile?.verificationStatus === 'VERIFIED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : profile?.verificationStatus === 'REJECTED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Verification: {profile?.verificationStatus || 'PENDING'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Service Area: <strong className="text-slate-800">{profile?.serviceArea || 'Bengaluru'}</strong> • Experience: <strong className="text-slate-800">{profile?.experienceYears || 1} yrs</strong> • Jobs Done: <strong className="text-slate-800">{profile?.completedJobsCount || 0}</strong>
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {profile?.skills.map((skill, idx) => (
              <span key={idx} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Real-time Availability Switch */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Work Matching Status
            </span>
            <span
              className={`text-xs font-bold ${
                profile?.availabilityStatus === 'AVAILABLE' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {profile?.availabilityStatus === 'AVAILABLE'
                ? '● Available for Jobs'
                : '○ Marked Unavailable'}
            </span>
          </div>

          <button
            onClick={handleToggleAvailability}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
              profile?.availabilityStatus === 'AVAILABLE'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {profile?.availabilityStatus === 'AVAILABLE'
              ? 'Mark Unavailable'
              : 'Mark Available'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-red-600">✕</button>
        </div>
      )}

      {/* Assigned Tasks Section (Active Jobs) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Your Assigned Work Orders</h2>
            <p className="text-xs text-slate-500">Confirmed tasks ready for on-site execution</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
            {assignedTasks.length} Active
          </span>
        </div>

        {assignedTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No active assignments. When a customer selects you and provides their 6-digit OTP, enter it below to confirm.
          </div>
        ) : (
          <div className="space-y-3">
            {assignedTasks.map(task => (
              <div
                key={task.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900">{task.title}</h3>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        task.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : task.status === 'COMPLETION_PENDING_CONFIRMATION'
                          ? 'bg-blue-100 text-blue-800'
                          : task.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 pt-1">
                    <span>Customer: <strong>{task.customerName || 'Customer'}</strong></span>
                    <span>Locality: <strong>{task.locality}</strong></span>
                    <span>Urgency: <strong className="capitalize">{task.urgency}</strong></span>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center space-x-2 shrink-0">
                  {task.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Job</span>
                    </button>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Mark Finished</span>
                    </button>
                  )}

                  {task.status === 'COMPLETION_PENDING_CONFIRMATION' && (
                    <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      Awaiting Customer Approval
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Tasks Feed Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Open Household Problem Feed</h2>
            <p className="text-xs text-slate-500">
              Review customer problems, Gemma 4 diagnostics, and express interest
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Appliance">Appliance</option>
              <option value="Painting">Painting</option>
            </select>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No open tasks available matching the selected filter in your region.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className="bg-white border border-slate-200 hover:border-brand-300 rounded-2xl p-5 shadow-sm transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                      {task.category || 'General'}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{task.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.locality}, {task.district}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>

                {/* Gemma 4 Brief Summary if present */}
                {task.aiAnalysis && (
                  <div className="bg-brand-50/50 border border-brand-100 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-brand-800 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      <span>Gemma 4 Diagnostic Summary</span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {task.aiAnalysis.problemSummary}
                    </p>
                    {task.aiAnalysis.safetyWarnings?.length > 0 && (
                      <p className="text-[11px] text-amber-800 font-semibold pt-0.5">
                        ⚠️ Caution: {task.aiAnalysis.safetyWarnings[0]}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons: Express Interest or Enter OTP */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-3">
                  <div className="flex items-center space-x-2">
                    {task.hasExpressedInterest ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        ✓ Interest Expressed
                      </span>
                    ) : (
                      expressingInterestId === task.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={interestMessage}
                            onChange={e => setInterestMessage(e.target.value)}
                            placeholder="Optional note to customer..."
                            className="text-xs px-3 py-1.5 border border-slate-300 rounded-xl outline-none"
                          />
                          <button
                            onClick={() => handleExpressInterest(task.id)}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => setExpressingInterestId(null)}
                            className="text-xs text-slate-500 font-semibold hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setExpressingInterestId(task.id)}
                          className="px-3.5 py-1.5 rounded-xl border border-brand-300 text-brand-700 hover:bg-brand-50 text-xs font-semibold transition-colors flex items-center space-x-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Express Interest</span>
                        </button>
                      )
                    )}
                  </div>

                  {/* Enter OTP button */}
                  <button
                    onClick={() => setSelectedTaskForOtp(task)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter Customer OTP</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Reviews Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Customer Reviews & Ratings</h2>
          <span className="text-xs text-slate-400">{reviews.length} Verified Reviews</span>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No completed job reviews yet. Once you complete assigned jobs, verified customer feedback will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map(rev => (
              <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{rev.customerName || 'Customer'}</span>
                  <div className="flex text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic">"{rev.comment}"</p>
                <span className="text-[10px] text-slate-400 block">
                  {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {selectedTaskForOtp && (
        <OtpVerifyModal
          isOpen={Boolean(selectedTaskForOtp)}
          onClose={() => setSelectedTaskForOtp(null)}
          requestId={selectedTaskForOtp.id}
          requestTitle={selectedTaskForOtp.title}
          customerName={selectedTaskForOtp.customerName}
          onConfirmed={async () => {
            await loadWorkerData();
            setSelectedTaskForOtp(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkerDashboard;
