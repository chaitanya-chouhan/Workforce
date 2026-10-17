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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAndAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError('Please provide a title and problem description.');
      return;
    }

    setLoading(true);
    setAnalyzing(true);
    setError(null);

    try {
      // 1. Create Request
      const created = await api.createRequest({
        title,
        description,
        category,
        locality,
        district,
        state: user?.state || 'Karnataka',
        urgency,
      });

      if (!created.success) {
        throw new Error(created.error || 'Failed to create request');
      }

      const newId = created.request.id;

      // 2. Call Gemma 4 Analysis endpoint with optional image
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const analyzeRes = await api.analyzeRequest(newId, formData);
      if (!analyzeRes.success) {
        throw new Error(analyzeRes.error || 'Gemma 4 diagnostic processing failed.');
      }

      // Reset form and select new request
      setShowNewForm(false);
      setTitle('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      await fetchRequests();
      setSelectedRequestId(newId);
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission and AI analysis.');
    } finally {
      setLoading(false);
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
        setFeedbackModalData({
          isOpen: true,
          requestId: selectedRequestId,
          workerName: currentRequest?.selectedWorkerId || 'Service Provider',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error confirming completion');
    } finally {
      setLoading(false);
    }
  };

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

            {/* Optional Image Upload */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center space-y-2">
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="Problem Preview"
                    className="max-h-40 mx-auto rounded-xl shadow-sm object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
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
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Images are processed in memory by Gemma 4 and never permanently stored.
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

                  {currentRequest.status === 'COMPLETION_PENDING_CONFIRMATION' && (
                    <button
                      onClick={handleConfirmCompletion}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                      Confirm Work Done & Review
                    </button>
                  )}
                </div>

                <h2 className="text-xl font-black text-slate-900 tracking-tight">{currentRequest.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{currentRequest.description}</p>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Locality: <strong className="text-slate-800">{currentRequest.locality}</strong></span>
                  <span>District: <strong className="text-slate-800">{currentRequest.district}</strong></span>
                  <span>Urgency: <strong className="text-slate-800 capitalize">{currentRequest.urgency}</strong></span>
                  <span>Created: <strong className="text-slate-800">{new Date(currentRequest.createdAt).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Gemma 4 Diagnostic Analysis Section */}
              {currentAiAnalysis && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900">Gemma 4 Diagnostic Interpretation</h3>
                        <p className="text-[11px] text-slate-500">Model: {currentAiAnalysis.modelId}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                      Preliminary AI Analysis
                    </span>
                  </div>

                  {/* Safety Alert (Gas / Fire / Live Sparks / Structural) */}
                  <SafetyAlert
                    severity={currentAiAnalysis.severity}
                    safetyWarnings={currentAiAnalysis.safetyWarnings}
                    basicChecks={currentAiAnalysis.basicChecks}
                    diyEligibility={currentAiAnalysis.diyEligibility}
                    requiresProfessional={currentAiAnalysis.requiresProfessional}
                  />

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
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
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
                          {cause.requiresInspection && (
                            <span className="text-[10px] text-indigo-600 font-semibold block pt-1">
                              • Requires on-site testing/inspection
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Uncertainty Notice */}
                  {currentAiAnalysis.uncertainty && (
                    <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed border border-slate-200">
                      <strong>Remote Uncertainty Notice:</strong> {currentAiAnalysis.uncertainty}
                    </div>
                  )}

                  {/* Cost Estimation Card */}
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
                    {matchingWorkers.length} Available
                  </span>
                </div>

                {/* Interested Workers Section (Workers who expressed interest) */}
                {interestedWorkers.length > 0 && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                      Workers Who Expressed Interest in This Job
                    </span>
                    <div className="space-y-2">
                      {interestedWorkers.map(iw => (
                        <div
                          key={iw.id}
                          className="bg-white rounded-xl p-3 border border-indigo-200/60 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-900">{iw.workerName || 'Worker'}</p>
                            <p className="text-[11px] text-slate-500 italic">"{iw.message}"</p>
                          </div>
                          <button
                            onClick={() => handleGenerateOtp(iw.workerId, iw.workerName || 'Worker')}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
                          >
                            Select & Generate OTP
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Matching Workers List */}
                <div className="space-y-3">
                  {matchingWorkers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No available verified workers found for this skill in {currentRequest.locality}. Nearby workers will appear here as they toggle their status to Available.
                    </div>
                  ) : (
                    matchingWorkers.map((sw, idx) => (
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
    </div>
  );
};

export default CustomerDashboard;
