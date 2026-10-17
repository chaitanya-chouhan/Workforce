import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkerProfile, User, Complaint, AuditLog, VerificationStatus } from '../types';
import {
  Shield,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Clock,
  Eye,
  Ban,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  Search,
  Filter,
  Check,
  Lock,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';

type AdminTab =
  | 'OVERVIEW'
  | 'PENDING_VERIFICATION'
  | 'WORKER_DIRECTORY'
  | 'CUSTOMER_DIRECTORY'
  | 'COMPLAINTS_WORKERS'
  | 'COMPLAINTS_CUSTOMERS'
  | 'BANS'
  | 'AUDIT_LOGS'
  | 'SECURITY';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filter states
  const [complaintFilterStatus, setComplaintFilterStatus] = useState<string>('ALL');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [banModal, setBanModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    reason: string;
  }>({ isOpen: false, userId: '', userName: '', reason: '' });

  const [verifyModal, setVerifyModal] = useState<{
    isOpen: boolean;
    workerId: string;
    workerName: string;
    status: 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
    notes: string;
  }>({ isOpen: false, workerId: '', workerName: '', status: 'VERIFIED', notes: '' });

  const [docPreviewModal, setDocPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string | null;
    loading: boolean;
  }>({ isOpen: false, title: '', url: null, loading: false });

  // Password Change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, wRes, uRes, cRes, aRes] = await Promise.all([
        api.getStats().catch(() => ({ stats: null })),
        api.getAdminWorkers().catch(() => ({ workers: [] })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAdminComplaints().catch(() => ({ complaints: [] })),
        api.getAuditLogs().catch(() => ({ logs: [] })),
      ]);

      if (sRes.stats) setStats(sRes.stats);
      if (wRes.workers) setWorkers(wRes.workers);
      if (uRes.users) setUsers(uRes.users);
      if (cRes.complaints) setComplaints(cRes.complaints);
      if (aRes.logs) setAuditLogs(aRes.logs);
    } catch (e: any) {
      console.warn('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // Verification actions
  const handleOpenVerifyModal = (
    workerId: string,
    workerName: string,
    status: 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUIRED'
  ) => {
    const defaultNotes =
      status === 'VERIFIED'
        ? 'Identity documentation reviewed and approved by administrator.'
        : status === 'RESUBMISSION_REQUIRED'
        ? 'Aadhaar document copy is unclear or unmasked. Please upload a clear masked Aadhaar copy.'
        : 'Identity document does not meet verification requirements.';

    setVerifyModal({
      isOpen: true,
      workerId,
      workerName,
      status,
      notes: defaultNotes,
    });
  };

  const submitWorkerVerification = async () => {
    if (!verifyModal.notes.trim()) {
      showNotification('error', 'Please enter verification review notes.');
      return;
    }

    try {
      const res = await api.verifyWorker(
        verifyModal.workerId,
        verifyModal.status,
        verifyModal.notes.trim()
      );
      if (res.success) {
        showNotification(
          'success',
          `Worker verification status updated to ${verifyModal.status}`
        );
        setVerifyModal({ ...verifyModal, isOpen: false });
        await loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Verification update failed.');
    }
  };

  // Document viewing
  const handleViewWorkerDocument = async (workerId: string, workerName: string) => {
    setDocPreviewModal({
      isOpen: true,
      title: `Identity Document: ${workerName}`,
      url: null,
      loading: true,
    });
    try {
      const blobUrl = await api.getAdminWorkerDocumentBlob(workerId);
      setDocPreviewModal({
        isOpen: true,
        title: `Identity Document: ${workerName}`,
        url: blobUrl,
        loading: false,
      });
    } catch (err: any) {
      setDocPreviewModal({ isOpen: false, title: '', url: null, loading: false });
      showNotification('error', err.message || 'Could not fetch worker document.');
    }
  };

  const handleViewComplaintEvidence = async (complaintId: string, subject: string) => {
    setDocPreviewModal({
      isOpen: true,
      title: `Complaint Evidence: ${subject}`,
      url: null,
      loading: true,
    });
    try {
      const blobUrl = await api.getComplaintEvidenceBlob(complaintId);
      setDocPreviewModal({
        isOpen: true,
        title: `Complaint Evidence: ${subject}`,
        url: blobUrl,
        loading: false,
      });
    } catch (err: any) {
      setDocPreviewModal({ isOpen: false, title: '', url: null, loading: false });
      showNotification('error', err.message || 'Could not fetch complaint evidence.');
    }
  };

  // Ban / Unban actions
  const submitBanUser = async () => {
    if (!banModal.reason.trim()) {
      showNotification('error', 'Please specify a reason for banning this account.');
      return;
    }

    try {
      const res = await api.banUser(banModal.userId, banModal.reason.trim());
      if (res.success) {
        showNotification('success', `User account ${banModal.userName} has been banned.`);
        setBanModal({ isOpen: false, userId: '', userName: '', reason: '' });
        await loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to ban user account.');
    }
  };

  const handleUnbanUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to lift the ban on account "${userName}"?`)) return;
    try {
      const res = await api.unbanUser(userId, 'Ban lifted by administrator.');
      if (res.success) {
        showNotification('success', `Ban lifted on account ${userName}.`);
        await loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to unban user account.');
    }
  };

  // Complaint Status Action
  const handleUpdateComplaintStatus = async (
    complaintId: string,
    status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'
  ) => {
    const notes = prompt(`Enter resolution notes for setting status to ${status}:`);
    if (notes === null) return;

    try {
      const res = await api.updateComplaintStatus(complaintId, status, notes || undefined);
      if (res.success) {
        showNotification('success', `Complaint marked as ${status}.`);
        await loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update complaint status.');
    }
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      showNotification('error', 'New passwords do not match.');
      return;
    }
    if (newPass.length < 8) {
      showNotification('error', 'Password must be at least 8 characters long.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await api.changeAdminPassword({
        currentPassword: currentPass || undefined,
        newPassword: newPass,
      });
      if (res.success) {
        showNotification('success', 'Administrator password updated successfully!');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        await loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to change administrator password.');
    } finally {
      setPassLoading(false);
    }
  };

  // Filtered views
  const pendingWorkers = workers.filter(
    w => w.verificationStatus === 'PENDING' || w.verificationStatus === 'RESUBMISSION_REQUIRED'
  );

  const customerUsers = users.filter(u => u.role === 'CUSTOMER');
  const bannedAccounts = users.filter(
    u => u.accountStatus === 'BANNED' || u.accountStatus === 'SUSPENDED'
  );

  const complaintsAgainstWorkers = complaints.filter(
    c =>
      c.targetUserRole === 'WORKER' &&
      (complaintFilterStatus === 'ALL' || c.status === complaintFilterStatus)
  );

  const complaintsAgainstCustomers = complaints.filter(
    c =>
      c.targetUserRole === 'CUSTOMER' &&
      (complaintFilterStatus === 'ALL' || c.status === complaintFilterStatus)
  );

  const filteredAuditLogs = auditLogs.filter(
    l => auditFilterAction === 'ALL' || l.action === auditFilterAction
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">WorkForce Administrator Operations</h1>
          </div>
          <p className="text-xs text-slate-400">
            Platform governance, identity compliance, complaint moderation, and security controls
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all self-start md:self-auto flex items-center space-x-1.5"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center space-x-2 border animate-fade-in ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Navigation Tabs (9 Operational Areas) */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-wrap gap-1">
        {[
          { id: 'OVERVIEW', label: 'Overview & Stats', count: null },
          { id: 'PENDING_VERIFICATION', label: 'Pending Verifications', count: pendingWorkers.length },
          { id: 'WORKER_DIRECTORY', label: 'Worker Directory', count: workers.length },
          { id: 'CUSTOMER_DIRECTORY', label: 'Customer Directory', count: customerUsers.length },
          { id: 'COMPLAINTS_WORKERS', label: 'Complaints (Workers)', count: complaintsAgainstWorkers.length },
          { id: 'COMPLAINTS_CUSTOMERS', label: 'Complaints (Customers)', count: complaintsAgainstCustomers.length },
          { id: 'BANS', label: 'Account Bans', count: bannedAccounts.length },
          { id: 'AUDIT_LOGS', label: 'Audit Log', count: auditLogs.length },
          { id: 'SECURITY', label: 'Security & Access', count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Pending Verifications
              </span>
              <div className="text-3xl font-black text-amber-600">{pendingWorkers.length}</div>
              <p className="text-[11px] text-slate-400">Workers awaiting identity document review</p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Open Complaints
              </span>
              <div className="text-3xl font-black text-red-600">
                {complaints.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW').length}
              </div>
              <p className="text-[11px] text-slate-400">Total reports pending resolution</p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Banned / Suspended
              </span>
              <div className="text-3xl font-black text-slate-800">{bannedAccounts.length}</div>
              <p className="text-[11px] text-slate-400">Accounts restricted from platform</p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Service Requests
              </span>
              <div className="text-3xl font-black text-brand-600">{stats?.totalRequests || 0}</div>
              <p className="text-[11px] text-slate-400">
                {stats?.completedRequests || 0} completed successfully
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Quick Operational Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('PENDING_VERIFICATION')}
                className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-left transition-colors space-y-1"
              >
                <span className="font-bold text-xs text-amber-950 block">Review Unverified Workers</span>
                <span className="text-[11px] text-amber-800">
                  {pendingWorkers.length} workers currently require administrator approval
                </span>
              </button>
              <button
                onClick={() => setActiveTab('COMPLAINTS_WORKERS')}
                className="p-4 rounded-2xl border border-red-200 bg-red-50/50 hover:bg-red-100/50 text-left transition-colors space-y-1"
              >
                <span className="font-bold text-xs text-red-950 block">Inspect Worker Complaints</span>
                <span className="text-[11px] text-red-800">
                  Review customer grievances, evidence photos, and safety alerts
                </span>
              </button>
              <button
                onClick={() => setActiveTab('SECURITY')}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors space-y-1"
              >
                <span className="font-bold text-xs text-slate-950 block">Security Settings</span>
                <span className="text-[11px] text-slate-600">
                  Manage administrator credentials and audit logs
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING WORKER VERIFICATION */}
      {activeTab === 'PENDING_VERIFICATION' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Pending Worker Identity Verification Queue
              </h2>
              <p className="text-xs text-slate-500">
                Inspect worker trade qualifications, review private Aadhaar documents, and grant or reject platform access.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              {pendingWorkers.length} Pending
            </span>
          </div>

          {pendingWorkers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              ✓ All worker identity verification applications have been reviewed!
            </div>
          ) : (
            <div className="space-y-4">
              {pendingWorkers.map(w => (
                <div
                  key={w.userId}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-slate-900">{w.name || 'Worker'}</h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                          {w.verificationStatus}
                        </span>
                        {w.maskedAadhaar && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Aadhaar: ****-****-{w.maskedAadhaar}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {w.email} • {w.phone || 'No phone'} • Area: {w.serviceArea} ({w.experienceYears} yrs exp)
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {w.identityDocumentSubmitted ? (
                        <button
                          onClick={() => handleViewWorkerDocument(w.userId, w.name || 'Worker')}
                          className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Private Document</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-amber-800 font-medium bg-amber-100/70 px-2.5 py-1 rounded-lg">
                          No document uploaded yet
                        </span>
                      )}
                    </div>
                  </div>

                  {w.bio && (
                    <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 italic">
                      "{w.bio}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {w.skills?.map((sk: string, sIdx: number) => (
                      <span key={sIdx} className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                        {sk}
                      </span>
                    ))}
                  </div>

                  {w.verificationNotes && (
                    <div className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-xl">
                      <strong>Previous Note:</strong> {w.verificationNotes}
                    </div>
                  )}

                  {/* Decision Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleOpenVerifyModal(w.userId, w.name || 'Worker', 'RESUBMISSION_REQUIRED')}
                      className="px-3.5 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 text-xs font-bold rounded-xl transition-colors"
                    >
                      Request Resubmission
                    </button>
                    <button
                      onClick={() => handleOpenVerifyModal(w.userId, w.name || 'Worker', 'REJECTED')}
                      className="px-3.5 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold rounded-xl transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleOpenVerifyModal(w.userId, w.name || 'Worker', 'VERIFIED')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Verification</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WORKER DIRECTORY */}
      {activeTab === 'WORKER_DIRECTORY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Complete Worker Directory</h2>
              <p className="text-xs text-slate-500">Comprehensive list of all registered service providers</p>
            </div>
            <span className="text-xs text-slate-400 font-bold">{workers.length} Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-bold">Worker</th>
                  <th className="p-3 font-bold">Area</th>
                  <th className="p-3 font-bold">Verification</th>
                  <th className="p-3 font-bold">Account</th>
                  <th className="p-3 font-bold">Rating / Jobs</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers.map(w => (
                  <tr key={w.userId} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{w.name || 'Worker'}</div>
                      <div className="text-[11px] text-slate-400">{w.email}</div>
                    </td>
                    <td className="p-3 text-slate-600">{w.serviceArea}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          w.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : w.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.verificationStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          w.accountStatus === 'BANNED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {w.accountStatus || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      ★ {w.averageRating ? w.averageRating.toFixed(1) : '5.0'} ({w.completedJobsCount || 0} jobs)
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {w.identityDocumentSubmitted && (
                        <button
                          onClick={() => handleViewWorkerDocument(w.userId, w.name || 'Worker')}
                          className="text-indigo-600 hover:underline font-bold"
                        >
                          Doc
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenVerifyModal(w.userId, w.name || 'Worker', 'VERIFIED')}
                        className="text-brand-600 hover:underline font-bold"
                      >
                        Verify
                      </button>
                      {w.accountStatus === 'BANNED' ? (
                        <button
                          onClick={() => handleUnbanUser(w.userId, w.name || 'Worker')}
                          className="text-emerald-600 hover:underline font-bold"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setBanModal({
                              isOpen: true,
                              userId: w.userId,
                              userName: w.name || 'Worker',
                              reason: '',
                            })
                          }
                          className="text-red-600 hover:underline font-bold"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER DIRECTORY */}
      {activeTab === 'CUSTOMER_DIRECTORY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Customer Directory</h2>
              <p className="text-xs text-slate-500">Registered household clients and customer accounts</p>
            </div>
            <span className="text-xs text-slate-400 font-bold">{customerUsers.length} Customers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-bold">Customer Name</th>
                  <th className="p-3 font-bold">Locality / District</th>
                  <th className="p-3 font-bold">Account Status</th>
                  <th className="p-3 font-bold">Registered</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email} • {u.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3 text-slate-600">
                      {u.locality || 'General'}, {u.district || 'City'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          u.accountStatus === 'BANNED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.accountStatus || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3 text-right">
                      {u.accountStatus === 'BANNED' ? (
                        <button
                          onClick={() => handleUnbanUser(u.uid, u.name)}
                          className="text-emerald-600 hover:underline font-bold"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setBanModal({
                              isOpen: true,
                              userId: u.uid,
                              userName: u.name,
                              reason: '',
                            })
                          }
                          className="text-red-600 hover:underline font-bold"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMPLAINTS AGAINST WORKERS */}
      {activeTab === 'COMPLAINTS_WORKERS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Customer Complaints Against Workers
              </h2>
              <p className="text-xs text-slate-500">
                Reports filed by customers regarding conduct, safety, non-appearance, or service issues
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={complaintFilterStatus}
                onChange={e => setComplaintFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>
          </div>

          {complaintsAgainstWorkers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No customer complaints matching the selected filter.
            </div>
          ) : (
            <div className="space-y-4">
              {complaintsAgainstWorkers.map(c => (
                <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-100 text-red-800">
                          {c.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{c.subject}</h4>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            c.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'DISMISSED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Reported By: <strong>{c.complainantName} (Customer)</strong> • Target Worker:{' '}
                        <strong className="text-slate-800">{c.targetUserName || c.targetUserId}</strong> •{' '}
                        {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {c.evidenceFileId && (
                      <button
                        onClick={() => handleViewComplaintEvidence(c.id, c.subject)}
                        className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-colors self-start sm:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Evidence</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {c.description}
                  </p>

                  {c.resolutionNotes && (
                    <div className="text-xs text-slate-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                      <strong>Resolution Note:</strong> {c.resolutionNotes}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleUpdateComplaintStatus(c.id, 'UNDER_REVIEW')}
                      className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl hover:bg-amber-100"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleUpdateComplaintStatus(c.id, 'DISMISSED')}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleUpdateComplaintStatus(c.id, 'RESOLVED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                    >
                      Resolve Issue
                    </button>
                    <button
                      onClick={() =>
                        setBanModal({
                          isOpen: true,
                          userId: c.targetUserId,
                          userName: c.targetUserName || 'Worker',
                          reason: `Banned from complaint: ${c.subject}`,
                        })
                      }
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                    >
                      Ban Worker
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: COMPLAINTS AGAINST CUSTOMERS */}
      {activeTab === 'COMPLAINTS_CUSTOMERS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Worker Complaints Against Customers
              </h2>
              <p className="text-xs text-slate-500">
                Reports filed by service providers regarding non-payment, abuse, or hazardous conditions
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={complaintFilterStatus}
                onChange={e => setComplaintFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>
          </div>

          {complaintsAgainstCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No worker complaints matching the selected filter.
            </div>
          ) : (
            <div className="space-y-4">
              {complaintsAgainstCustomers.map(c => (
                <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {c.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{c.subject}</h4>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            c.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'DISMISSED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Reported By: <strong>{c.complainantName} (Worker)</strong> • Target Customer:{' '}
                        <strong className="text-slate-800">{c.targetUserName || c.targetUserId}</strong> •{' '}
                        {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {c.evidenceFileId && (
                      <button
                        onClick={() => handleViewComplaintEvidence(c.id, c.subject)}
                        className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-colors self-start sm:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Evidence</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {c.description}
                  </p>

                  {c.resolutionNotes && (
                    <div className="text-xs text-slate-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                      <strong>Resolution Note:</strong> {c.resolutionNotes}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleUpdateComplaintStatus(c.id, 'UNDER_REVIEW')}
                      className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl hover:bg-amber-100"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleUpdateComplaintStatus(c.id, 'DISMISSED')}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleUpdateComplaintStatus(c.id, 'RESOLVED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                    >
                      Resolve Issue
                    </button>
                    <button
                      onClick={() =>
                        setBanModal({
                          isOpen: true,
                          userId: c.targetUserId,
                          userName: c.targetUserName || 'Customer',
                          reason: `Banned from complaint: ${c.subject}`,
                        })
                      }
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                    >
                      Ban Customer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: ACCOUNT BANS */}
      {activeTab === 'BANS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Account Bans & Suspensions
              </h2>
              <p className="text-xs text-slate-500">
                Overview of blocked accounts across customers and service providers
              </p>
            </div>
            <span className="text-xs text-red-700 font-bold bg-red-50 px-3 py-1 rounded-full">
              {bannedAccounts.length} Banned Accounts
            </span>
          </div>

          {bannedAccounts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No accounts are currently banned or suspended.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">User</th>
                    <th className="p-3 font-bold">Role</th>
                    <th className="p-3 font-bold">Ban Reason</th>
                    <th className="p-3 font-bold">Banned Date</th>
                    <th className="p-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bannedAccounts.map(b => (
                    <tr key={b.uid} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{b.name}</div>
                        <div className="text-[11px] text-slate-400">{b.email}</div>
                      </td>
                      <td className="p-3 font-semibold">{b.role}</td>
                      <td className="p-3 text-red-700 font-medium">{b.banReason || 'Policy violation'}</td>
                      <td className="p-3 text-slate-400">
                        {b.bannedAt ? new Date(b.bannedAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleUnbanUser(b.uid, b.name)}
                          className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl transition-colors"
                        >
                          Lift Ban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Administrative Audit Log</h2>
              <p className="text-xs text-slate-500">
                Immutable record of administrative verifications, bans, status changes, and security events
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={auditFilterAction}
                onChange={e => setAuditFilterAction(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="WORKER_VERIFIED">Worker Verifications</option>
                <option value="USER_BANNED">User Bans</option>
                <option value="USER_UNBANNED">User Unbans</option>
                <option value="COMPLAINT_STATUS_UPDATED">Complaint Updates</option>
                <option value="ADMIN_PASSWORD_CHANGED">Password Changes</option>
              </select>
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No audit logs recorded for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Action</th>
                    <th className="p-3 font-bold">Actor</th>
                    <th className="p-3 font-bold">Target</th>
                    <th className="p-3 font-bold">Details</th>
                    <th className="p-3 font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {log.actorEmail || log.actorId} ({log.actorRole})
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">
                        {log.targetType}: {log.targetId ? log.targetId.slice(0, 10) : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-700 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: SECURITY SETTINGS */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 animate-fade-in max-w-2xl">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-black text-slate-900 tracking-tight">Security & Access Management</h2>
            <p className="text-xs text-slate-500">
              Manage your administrator credentials and review security compliance policies
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900">Change Administrator Password</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password (Optional if newly provisioned)
              </label>
              <input
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Enter current password..."
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (Minimum 8 characters)
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Enter new strong password..."
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Confirm new strong password..."
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="py-2.5 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{passLoading ? 'Updating Credentials...' : 'Update Password & Clear Temporary State'}</span>
            </button>
          </form>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center space-x-1.5 font-bold text-slate-900">
              <Shield className="w-4 h-4 text-brand-600" />
              <span>Security Architecture Standards</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              • Administrative roles are verified on every backend request via Firebase Auth ID tokens and Firestore custom claims.
            </p>
            <p className="text-[11px] leading-relaxed">
              • Identity documents and complaint evidence are stored exclusively in private, access-controlled server storage and served through authenticated streaming routes.
            </p>
            <p className="text-[11px] leading-relaxed">
              • Password changes automatically clear temporary initial password flags and generate timestamped immutable audit logs.
            </p>
          </div>
        </div>
      )}

      {/* VERIFY WORKER MODAL */}
      {verifyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Confirm Verification: {verifyModal.workerName}
            </h3>
            <p className="text-xs text-slate-600">
              Setting verification status to: <strong className="uppercase">{verifyModal.status}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Notes / Reason (Mandatory)
              </label>
              <textarea
                rows={3}
                required
                value={verifyModal.notes}
                onChange={e => setVerifyModal({ ...verifyModal, notes: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setVerifyModal({ ...verifyModal, isOpen: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={submitWorkerVerification}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAN USER MODAL */}
      {banModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-sm text-red-950">
              Ban User Account: {banModal.userName}
            </h3>
            <p className="text-xs text-slate-600">
              Banning this user will block them from submitting requests, accepting jobs, and verifying OTPs. Active assignments will be safely cancelled and counterparties notified.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Ban (Mandatory)
              </label>
              <textarea
                rows={3}
                required
                value={banModal.reason}
                onChange={e => setBanModal({ ...banModal, reason: e.target.value })}
                placeholder="Specify violation or complaint reference..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setBanModal({ ...banModal, isOpen: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={submitBanUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Confirm Account Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {docPreviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">{docPreviewModal.title}</h3>
              <button
                onClick={() => setDocPreviewModal({ isOpen: false, title: '', url: null, loading: false })}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[300px]">
              {docPreviewModal.loading ? (
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs text-slate-500">Retrieving encrypted private document...</span>
                </div>
              ) : docPreviewModal.url ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                  <iframe
                    src={docPreviewModal.url}
                    title="Document Preview"
                    className="w-full h-[500px] rounded-xl border border-slate-200 bg-white"
                  />
                  <a
                    href={docPreviewModal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Full Tab</span>
                  </a>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Unable to load document preview.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
