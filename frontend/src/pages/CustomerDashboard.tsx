import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ServiceRequest,
  AIAnalysis,
  ScoredWorker,
  TaskInterest,
  Assignment,
} from '../types';
import SafetyAlert from '../components/SafetyAlert';
import CostEstimateCard from '../components/CostEstimateCard';
import OtpDisplayModal from '../components/OtpDisplayModal';
import FeedbackModal from '../components/FeedbackModal';
import ComplaintModal from '../components/ComplaintModal';
import {
  PlusCircle,
  FileText,
  Sparkles,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Star,
  Users,
  ChevronRight,
  Shield,
  ShieldAlert,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [currentRequest, setCurrentRequest] = useState<ServiceRequest | null>(null);
  const [currentAiAnalysis, setCurrentAiAnalysis] = useState<AIAnalysis | null>(null);
  const [interestedWorkers, setInterestedWorkers] = useState<TaskInterest[]>([]);
  const [matchingWorkers, setMatchingWorkers] = useState<ScoredWorker[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);

  // Form State
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [locality, setLocality] = useState(user?.locality || 'Indiranagar');
  const [district, setDistrict] = useState(user?.district || 'Bengaluru');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'emergency'>('medium');
  const [preferredTime, setPreferredTime] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [imageFileSize, setImageFileSize] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // State loading & modals
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Modal State
  const [otpModalData, setOtpModalData] = useState<{
    isOpen: boolean;
    otp: string;
    expiresAt: string;
    workerName: string;
  }>({
    isOpen: false,
    otp: '',
    expiresAt: '',
    workerName: '',
  });

  // Feedback Modal State
  const [feedbackModalData, setFeedbackModalData] = useState<{
    isOpen: boolean;
    requestId: string;
    workerName: string;
  }>({
    isOpen: false,
    requestId: '',
    workerName: '',
  });

  // Complaint Modal State
  const [complaintModalData, setComplaintModalData] = useState<{
    isOpen: boolean;
    workerId: string;
    workerName: string;
    requestId: string;
  } | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.getRequests();
      if (res.success && res.requests) {
        setRequests(res.requests);
        if (!selectedRequestId && res.requests.length > 0) {
          setSelectedRequestId(res.requests[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Error fetching requests:', err);
    }
  };

  const fetchRequestDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.getRequest(id);
      if (res.success) {
        setCurrentRequest(res.request);
        setCurrentAiAnalysis(res.aiAnalysis || null);
        setInterestedWorkers(res.interestedWorkers || []);
        setActiveAssignment(res.assignment || null);

        // Fetch matching workers if analyzed or open
        if (
          res.request.status === 'OPEN_FOR_WORKERS' ||
          res.request.status === 'AWAITING_ASSIGNMENT_CONFIRMATION'
        ) {
          try {
            const matchRes = await api.getMatchingWorkers(id);
            if (matchRes.success && matchRes.matches) {
              setMatchingWorkers(matchRes.matches.workers || []);
            }
          } catch (mErr) {
            console.warn('Could not load worker matches:', mErr);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedRequestId) {
      fetchRequestDetails(selectedRequestId);
    }
  }, [selectedRequestId]);

  // Live polling for requests awaiting worker response or OTP confirmation
  useEffect(() => {
    if (!selectedRequestId) return;
    if (
      currentRequest?.status !== 'OPEN_FOR_WORKERS' &&
      currentRequest?.status !== 'AWAITING_ASSIGNMENT_CONFIRMATION'
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      api.getRequest(selectedRequestId)
        .then(res => {
          if (res.success && res.request) {
            setCurrentRequest(res.request);
            if (res.aiAnalysis) setCurrentAiAnalysis(res.aiAnalysis);
            if (res.interestedWorkers) setInterestedWorkers(res.interestedWorkers);
            setActiveAssignment(res.assignment || null);
          }
        })
        .catch(() => {
          // ignore silent polling errors
        });
    }, 3000);

    return () => clearInterval(intervalId);
  }, [selectedRequestId, currentRequest?.status]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP images are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError(null);
    setImageFile(file);
    setImageFileName(file.name);
    setImageFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageFileName(null);
    setImageFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateAndAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a title and problem description.');
      return;
    }

    setLoading(true);
    setAnalyzing(true);
    setError(null);

    let newId: string | null = null;
    const capturedImageFile = imageFile;

    try {
      // 1. Create Request (safely sending trimmed preferredTime only if provided)
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        locality: locality.trim(),
        district: district.trim(),
        state: user?.state || 'Karnataka',
        urgency,
      };

      if (preferredTime && preferredTime.trim()) {
        payload.preferredTime = preferredTime.trim();
      }

      const created = await api.createRequest(payload);

      if (!created.success || !created.request?.id) {
        throw new Error(created.error || 'Failed to create request');
      }

      newId = created.request.id;

      // Request created successfully: clean up form and select request
      setShowNewForm(false);
      setTitle('');
      setDescription('');
      setPreferredTime('');
      handleRemovePhoto();
      await fetchRequests();
      setSelectedRequestId(newId);
    } catch (createErr: any) {
      setError(createErr.message || 'Failed to submit service request.');
      setLoading(false);
      setAnalyzing(false);
      return;
    }

    // 2. Call AI Diagnostic endpoint with optional image
    if (newId) {
      try {
        const formData = new FormData();
        if (capturedImageFile) {
          formData.append('image', capturedImageFile);
        }

        const analyzeRes = await api.analyzeRequest(newId, formData);
        if (!analyzeRes.success) {
          setError(
            `Service request created (Status: Submitted), but diagnostic interpretation returned: ${
              analyzeRes.error || 'Unknown error'
            }`
          );
        }
        await fetchRequestDetails(newId);
        await fetchRequests();
      } catch (aiErr: any) {
        setError(
          `Service request created (Status: Submitted), but AI-powered analysis failed: ${aiErr.message}`
        );
        await fetchRequestDetails(newId);
        await fetchRequests();
      } finally {
        setLoading(false);
        setAnalyzing(false);
      }
    }
  };

  const handleRunDiagnostic = async (requestId: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      const res = await api.analyzeRequest(requestId, formData);
      if (!res.success) {
        setError(res.error || 'Failed to run diagnostic interpretation.');
      } else {
        await fetchRequestDetails(requestId);
        await fetchRequests();
      }
    } catch (err: any) {
      setError(`Diagnostic interpretation error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateOtp = async (workerId: string, workerName: string) => {
    if (!selectedRequestId) return;
    setLoading(true);
    try {
      const res = await api.generateAssignmentOtp(selectedRequestId, workerId);
      if (res.success) {
        setOtpModalData({
          isOpen: true,
          otp: res.otp,
          expiresAt: res.expiresAt,
          workerName,
        });
        await fetchRequestDetails(selectedRequestId);
        await fetchRequests();
      } else {
        setError(res.error || 'Failed to generate assignment OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!selectedRequestId) return;
    setLoading(true);
    try {
      const res = await api.confirmTaskCompletion(selectedRequestId);
      if (res.success) {
        await fetchRequestDetails(selectedRequestId);
        await fetchRequests();
        const resolvedName =
          activeAssignment?.workerName ||
          (currentRequest as any)?.assignedWorkerName ||
          'Service Provider';
        setFeedbackModalData({
          isOpen: true,
          requestId: selectedRequestId,
          workerName: resolvedName,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error confirming completion');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInterest = async (workerId: string, workerName: string) => {
    if (!selectedRequestId) return;
    if (!confirm(`Are you sure you want to decline interest from ${workerName}?`)) return;
    setLoading(true);
    try {
      const res = await api.declineTaskInterest(selectedRequestId, workerId);
      if (res.success) {
        // Optimistically mark worker interest as rejected immediately
        setInterestedWorkers(prev =>
          prev.map(iw => (iw.workerId === workerId ? { ...iw, status: 'REJECTED' } : iw))
        );
        await fetchRequestDetails(selectedRequestId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to decline worker interest.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAssignment = async () => {
    if (!selectedRequestId) return;
    if (!confirm('Are you sure you want to cancel this pending assignment and pick another worker?')) return;
    setLoading(true);
    try {
      const res = await api.cancelAssignment(selectedRequestId);
      if (res.success) {
        setActiveAssignment(null);
        await fetchRequestDetails(selectedRequestId);
        await fetchRequests();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel assignment.');
    } finally {
      setLoading(false);
    }
  };

  // Active technicians who have taken interest and are pending response
  const activeInterestedWorkers = interestedWorkers.filter(
    iw => iw.status === 'PENDING'
  );

  // Set of worker IDs who have been declined by the customer
  const declinedWorkerIds = new Set(
    interestedWorkers.filter(iw => iw.status === 'REJECTED').map(iw => iw.workerId)
  );

  // Filter out any matching workers that have been declined
  const visibleMatchingWorkers = matchingWorkers.filter(
    sw => !declinedWorkerIds.has(sw.worker.userId)
  );

  // Is task assigned or completed?
  const isTaskAssigned = Boolean(
    currentRequest &&
      ['ASSIGNED', 'IN_PROGRESS', 'COMPLETION_PENDING_CONFIRMATION', 'COMPLETED'].includes(
        currentRequest.status
      )
  );

  // Is an assignment currently pending OTP verification?
  const isAssignmentPendingOtp = Boolean(
    activeAssignment && activeAssignment.status === 'PENDING_OTP'
  );

  // Available count: increases when workers take interest in the issue, decreases as customer declines, 0 when assigned
  const availableCount = isTaskAssigned ? 0 : activeInterestedWorkers.length;

  // Show "Technicians Interested in Your Request" only if task is open, no OTP pending or assignment confirmed, and there are active interested workers
  const showInterestedWorkersBox =
    currentRequest?.status === 'OPEN_FOR_WORKERS' &&
    !isAssignmentPendingOtp &&
    !isTaskAssigned &&
    activeInterestedWorkers.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md">
            Customer Dashboard
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Locality: <span className="font-semibold text-slate-700">{user?.locality || 'Bengaluru'}</span> • Manage household repairs and view AI diagnostic insights.
          </p>
        </div>

        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showNewForm ? 'Close Form' : 'Submit New Problem'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Attention Needed</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* New Problem Submission Card */}
      {showNewForm && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-brand-500/30 animate-fadeIn space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <span>Describe Your Household Problem</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gemma 4 will analyze your description and photo, check safety hazards, and estimate rates.
            </p>
          </div>

          <form onSubmit={handleCreateAndAnalyze} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Problem Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Bathroom sink pipe leaking heavily"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                >
                  <option value="Plumbing">Plumbing & Water Fixtures</option>
                  <option value="Electrical">Electrical & Wiring</option>
                  <option value="Carpentry">Carpentry & Doors</option>
                  <option value="Appliance">Appliance Repair</option>
                  <option value="Painting">Painting & Plaster</option>
                  <option value="Cleaning">Deep Cleaning</option>
                  <option value="Masonry">Masonry & Tiling</option>
                  <option value="General">General Maintenance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Problem Description (Ordinary Conversational Language)
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explain what happened, any unusual noises, smells, water leaks, or sparking..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Locality</label>
                <input
                  type="text"
                  required
                  value={locality}
                  onChange={e => setLocality(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">District / City</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as any)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                >
                  <option value="low">Low — Whenever convenient</option>
                  <option value="medium">Medium — Within 24-48 hours</option>
                  <option value="high">High — Today</option>
                  <option value="emergency">Emergency — Immediate danger</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Schedule / Time (Optional)
              </label>
              <input
                type="text"
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                placeholder="e.g. Tomorrow morning after 10 AM, or Weekends"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Optional Image Upload */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center space-y-2">
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="Problem Preview"
                    className="max-h-40 mx-auto rounded-xl shadow-sm object-cover"
                  />
                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800 truncate max-w-xs">{imageFileName}</span>
                    {imageFileSize && <span className="text-slate-400">({imageFileSize})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs text-red-600 font-semibold hover:underline"
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <label className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700">
                    <span>Upload a problem photo (Optional, max 5MB)</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Images (JPEG, PNG, WebP up to 5MB) are analyzed in memory by Gemma 4 and never permanently stored.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 disabled:opacity-50 flex items-center space-x-2"
              >
                {analyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gemma 4 is Analyzing Problem...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit & Run AI Diagnostic</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Layout: History on Left, Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Request List */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Your Service History</h3>
            <span className="text-xs text-slate-400 font-medium">{requests.length} Requests</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No service requests submitted yet. Click "Submit New Problem" above to get started.
              </div>
            ) : (
              requests.map(req => {
                const isSelected = req.id === selectedRequestId;
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-left ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                        {req.category || 'General'}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          req.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : req.status === 'ASSIGNED' || req.status === 'IN_PROGRESS'
                            ? 'bg-indigo-100 text-indigo-700'
                            : req.status === 'AWAITING_ASSIGNMENT_CONFIRMATION'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1 truncate">{req.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{req.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span>{req.locality}</span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Request Details */}
        <div className="lg:col-span-8 space-y-6">
          {currentRequest ? (
            <div className="space-y-6">
              {/* Request Status Header Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Request ID: {currentRequest.id.slice(0, 8)}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentRequest.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentRequest.status === 'IN_PROGRESS'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-brand-100 text-brand-800'
                      }`}
                    >
                      Status: {currentRequest.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {currentRequest.status === 'COMPLETION_PENDING_CONFIRMATION' && (
                      <button
                        onClick={handleConfirmCompletion}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                      >
                        Confirm Work Done & Review
                      </button>
                    )}
                    {(activeAssignment?.workerId || (currentRequest as any).assignedWorkerId) && (
                      <button
                        onClick={() =>
                          setComplaintModalData({
                            isOpen: true,
                            workerId: activeAssignment?.workerId || (currentRequest as any).assignedWorkerId,
                            workerName: activeAssignment?.workerName || 'Assigned Worker',
                            requestId: currentRequest.id,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Report Worker</span>
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-black text-slate-900 tracking-tight">{currentRequest.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{currentRequest.description}</p>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Locality: <strong className="text-slate-800">{currentRequest.locality}</strong></span>
                  <span>District: <strong className="text-slate-800">{currentRequest.district}</strong></span>
                  <span>Urgency: <strong className="text-slate-800 capitalize">{currentRequest.urgency}</strong></span>
                  {currentRequest.preferredTime && (
                    <span>Preferred Time: <strong className="text-slate-800">{currentRequest.preferredTime}</strong></span>
                  )}
                  <span>Created: <strong className="text-slate-800">{new Date(currentRequest.createdAt).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Action Banner for Submitted Requests without AI Analysis */}
              {currentRequest.status === 'SUBMITTED' && !currentAiAnalysis && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Run Gemma 4 Diagnostic Interpretation</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This request has been saved in your history. You can run Gemma 4 diagnostic interpretation now to evaluate safety risks, identify required worker skills, and calculate sample cost estimates.
                  </p>
                  <button
                    onClick={() => handleRunDiagnostic(currentRequest.id)}
                    disabled={analyzing}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Analyzing with Gemma 4...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Run Gemma 4 Diagnostic</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* AI Diagnostic Analysis Section */}
              {currentAiAnalysis && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900">AI Diagnostic Interpretation</h3>
                        <p className="text-[11px] text-slate-500">
                          Structured multimodal issue evaluation & verified rate estimates
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentAiAnalysis.confidence && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                          Confidence: {currentAiAnalysis.confidence}
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                        Preliminary Assessment
                      </span>
                    </div>
                  </div>

                  {/* Safety Alert (Gas / Fire / Live Sparks / Structural) */}
                  <SafetyAlert
                    severity={currentAiAnalysis.severity}
                    safetyWarnings={currentAiAnalysis.safetyWarnings}
                    basicChecks={currentAiAnalysis.basicChecks}
                    diyEligibility={currentAiAnalysis.diyEligibility}
                    requiresProfessional={currentAiAnalysis.requiresProfessional}
                  />

                  {/* Intelligent Image Quality & Authenticity Assessment */}
                  {currentAiAnalysis.imageAssessment?.hasImage && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <ImageIcon className="w-4 h-4 text-brand-600" />
                          <h4 className="font-bold text-xs text-slate-900">
                            Uploaded Problem Image Evaluation
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            currentAiAnalysis.imageAssessment.qualitySufficientForDiagnosis
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {currentAiAnalysis.imageAssessment.qualitySufficientForDiagnosis
                            ? '✓ Quality Sufficient for Assessment'
                            : '⚠️ Unclear Image — Physical Check Recommended'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Clarity</span>
                          <span className="font-bold text-slate-800">
                            {currentAiAnalysis.imageAssessment.quality?.isClear ? 'Clear & Sharp' : 'Slightly Blurry'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Lighting</span>
                          <span className="font-bold text-slate-800 capitalize">
                            {currentAiAnalysis.imageAssessment.quality?.lighting || 'Adequate'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Damaged Part</span>
                          <span className="font-bold text-slate-800">
                            {currentAiAnalysis.imageAssessment.quality?.componentVisible ? 'Visible' : 'Partially Hidden'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Authenticity</span>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {currentAiAnalysis.imageAssessment.authenticity?.status === 'verified_authentic'
                              ? 'Verified'
                              : 'Unable to verify'}
                          </span>
                        </div>
                      </div>

                      {currentAiAnalysis.imageAssessment.guidance && (
                        <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <strong>Image Guidance:</strong> {currentAiAnalysis.imageAssessment.guidance}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Problem Summary & Observations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary of Symptoms</h4>
                    <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                      {currentAiAnalysis.problemSummary}
                    </p>

                    {currentAiAnalysis.observations?.length > 0 && (
                      <div className="text-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-600">Reported/Observed Symptoms:</span>
                        <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                          {currentAiAnalysis.observations.map((obs, idx) => (
                            <li key={idx}>{obs}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Possible Causes List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Possible Causes (Preliminary Possibilities)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentAiAnalysis.possibleCauses?.map((cause, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{cause.cause}</span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                cause.likelihood === 'high'
                                  ? 'bg-amber-100 text-amber-800'
                                  : cause.likelihood === 'medium'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              Likelihood: {cause.likelihood}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{cause.reason}</p>

                          {cause.recommendedRepair && (
                            <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                              <strong className="text-slate-900">Repair Approach:</strong> {cause.recommendedRepair}
                            </div>
                          )}

                          {cause.partsRequired && cause.partsRequired.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                              <span>Parts: </span>
                              <span className="font-semibold text-slate-700">{cause.partsRequired.join(', ')}</span>
                            </div>
                          )}

                          {cause.requiresInspection && (
                            <span className="text-[10px] text-indigo-600 font-semibold block pt-0.5">
                              • Requires on-site verification & inspection
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assumptions & Uncertainty Notice */}
                  {(currentAiAnalysis.uncertainty || (currentAiAnalysis.assumptions && currentAiAnalysis.assumptions.length > 0)) && (
                    <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed border border-slate-200 space-y-1">
                      {currentAiAnalysis.uncertainty && (
                        <p>
                          <strong>Remote Diagnostic Uncertainty:</strong> {currentAiAnalysis.uncertainty}
                        </p>
                      )}
                      {currentAiAnalysis.assumptions && currentAiAnalysis.assumptions.length > 0 && (
                        <p>
                          <strong>Operating Assumptions:</strong> {currentAiAnalysis.assumptions.join('; ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Itemized Cost Estimation Card */}
                  <CostEstimateCard estimate={currentAiAnalysis.costEstimate} />
                </div>
              )}

              {/* Workers & OTP Assignment Section */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-base text-slate-900">Eligible Local Service Providers</h3>
                    <p className="text-xs text-slate-500">
                      Workers filtered by skills, availability status, and locality coverage
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                    {availableCount} Available
                  </span>
                </div>

                {/* Pending Assignment Banner */}
                {activeAssignment && activeAssignment.status === 'PENDING_OTP' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-amber-950 uppercase tracking-wider block">
                          Assignment Pending OTP Verification
                        </span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                          Awaiting Technician
                        </span>
                      </div>
                      <p className="text-xs text-amber-800">
                        Selected Technician: <strong className="text-amber-950">{activeAssignment.workerName || 'Worker'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={handleCancelAssignment}
                        disabled={loading}
                        className="px-3.5 py-2 border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl transition-all"
                      >
                        Cancel & Choose Another Worker
                      </button>
                      <button
                        onClick={() =>
                          setOtpModalData({
                            isOpen: true,
                            otp: (activeAssignment as any).otp || '******',
                            expiresAt: activeAssignment.otpExpiresAt || '',
                            workerName: activeAssignment.workerName || 'Worker',
                          })
                        }
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>View OTP</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Interested Workers Section (Workers who expressed interest) */}
                {showInterestedWorkersBox && (
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-950 uppercase tracking-wider block">
                        Technicians Interested in Your Request
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                        {activeInterestedWorkers.length} Expressed Interest
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeInterestedWorkers.map(iw => (
                        <div
                          key={iw.id}
                          className="bg-white rounded-2xl p-4 border border-indigo-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-sm text-slate-900">{iw.workerName || 'Local Technician'}</h4>
                              <span className="inline-flex items-center text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                                {typeof iw.workerRating === 'number'
                                  ? iw.workerRating.toFixed(1)
                                  : '5.0'}{' '}
                                / 5.0
                              </span>
                              {(iw.workerCompletedJobsCount ?? 0) > 0 && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  • {iw.workerCompletedJobsCount} jobs completed
                                </span>
                              )}
                              {iw.workerServiceArea && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  • {iw.workerServiceArea}
                                </span>
                              )}
                            </div>

                            {iw.message && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                                "{iw.message}"
                              </p>
                            )}

                            {iw.workerSkills && iw.workerSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {iw.workerSkills.map((sk: string, sIdx: number) => (
                                  <span
                                    key={sIdx}
                                    className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                                  >
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Options: Accept & Decline */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                            <button
                              onClick={() => handleDeclineInterest(iw.workerId, iw.workerName || 'Worker')}
                              disabled={loading}
                              className="px-3.5 py-2 border border-slate-300 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-xs rounded-xl transition-all"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleGenerateOtp(iw.workerId, iw.workerName || 'Worker')}
                              disabled={loading}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Accept & Generate OTP</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Matching Workers List */}
                <div className="space-y-3">
                  {visibleMatchingWorkers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No available verified workers found for this skill in {currentRequest.locality}. Nearby workers will appear here as they toggle their status to Available.
                    </div>
                  ) : (
                    visibleMatchingWorkers.map((sw, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-300 transition-colors"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900">{sw.worker.name || 'Local Technician'}</h4>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              {sw.score}% Match
                            </span>
                            <span className="text-xs font-semibold text-amber-500 flex items-center">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                              {sw.worker.averageRating.toFixed(1)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {sw.matchedSkills.map((sk, sIdx) => (
                              <span key={sIdx} className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                                {sk}
                              </span>
                            ))}
                            <span className="text-[10px] text-slate-500 ml-1">
                              • Area: {sw.worker.serviceArea} • {sw.worker.completedJobsCount} jobs completed
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500">{sw.reasons.join(' • ')}</p>
                        </div>

                        {currentRequest.status === 'OPEN_FOR_WORKERS' ||
                        currentRequest.status === 'AWAITING_ASSIGNMENT_CONFIRMATION' ? (
                          <button
                            onClick={() => handleGenerateOtp(sw.worker.userId, sw.worker.name || 'Worker')}
                            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all shrink-0 flex items-center justify-center space-x-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Generate Assignment OTP</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Task Assigned</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 shadow-sm border border-slate-200">
              Select a service request from the history list or submit a new problem.
            </div>
          )}
        </div>
      </div>

      {/* OTP Display Modal */}
      <OtpDisplayModal
        isOpen={otpModalData.isOpen}
        onClose={() => setOtpModalData(prev => ({ ...prev, isOpen: false }))}
        otp={otpModalData.otp}
        expiresAt={otpModalData.expiresAt}
        workerName={otpModalData.workerName}
        requestTitle={currentRequest?.title}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalData.isOpen}
        onClose={() => setFeedbackModalData(prev => ({ ...prev, isOpen: false }))}
        requestId={feedbackModalData.requestId}
        workerName={feedbackModalData.workerName}
        requestTitle={currentRequest?.title}
        onSubmitted={() => {
          if (selectedRequestId) fetchRequestDetails(selectedRequestId);
        }}
      />

      {/* Complaint Modal */}
      {complaintModalData && (
        <ComplaintModal
          isOpen={complaintModalData.isOpen}
          onClose={() => setComplaintModalData(null)}
          targetUserId={complaintModalData.workerId}
          targetUserName={complaintModalData.workerName}
          targetRole="WORKER"
          requestId={complaintModalData.requestId}
          onSubmitted={() => {
            if (selectedRequestId) fetchRequestDetails(selectedRequestId);
          }}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
