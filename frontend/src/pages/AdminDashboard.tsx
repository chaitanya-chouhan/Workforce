import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkerProfile, RateCard, Skill } from '../types';
import {
  Shield,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'STATS' | 'WORKERS' | 'RATE_CARDS' | 'REQUESTS'>('STATS');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // New Rate Card Form State
  const [showRateCardModal, setShowRateCardModal] = useState(false);
  const [rcSkillId, setRcSkillId] = useState('plumbing');
  const [rcSkillName, setRcSkillName] = useState('Plumbing');
  const [rcLocality, setRcLocality] = useState('All Localities');
  const [rcBaseLabour, setRcBaseLabour] = useState(300);
  const [rcMinCharge, setRcMinCharge] = useState(250);
  const [rcTravel, setRcTravel] = useState(50);
  const [rcMaterials, setRcMaterials] = useState(150);

  const loadAdminData = async () => {
    try {
      const [sRes, wRes, rRes, skRes, reqRes] = await Promise.all([
        api.getStats().catch(() => ({ stats: null })),
        api.getAdminWorkers().catch(() => ({ workers: [] })),
        api.getRateCards().catch(() => ({ rateCards: [] })),
        api.getSkills().catch(() => ({ skills: [] })),
        api.getAdminRequests().catch(() => ({ requests: [] })),
      ]);

      if (sRes.stats) setStats(sRes.stats);
      if (wRes.workers) setWorkers(wRes.workers);
      if (rRes.rateCards) setRateCards(rRes.rateCards);
      if (skRes.skills) setSkills(skRes.skills);
      if (reqRes.requests) setRequests(reqRes.requests);
    } catch (e) {
      console.warn('Error loading admin data:', e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerifyWorker = async (workerId: string, status: 'VERIFIED' | 'REJECTED') => {
    setLoading(true);
    try {
      const res = await api.verifyWorker(workerId, status, 'Reviewed by administrator');
      if (res.success) {
        setMsg(`Worker status updated to ${status}`);
        await loadAdminData();
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Verification update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createRateCard({
        skillId: rcSkillId,
        skillName: rcSkillName,
        locality: rcLocality,
        baseLabourRate: Number(rcBaseLabour),
        minimumCharge: Number(rcMinCharge),
        travelRate: Number(rcTravel),
        indicativeMaterialsAllowance: Number(rcMaterials),
        currency: 'INR',
        active: true,
      });

      if (res.success) {
        setShowRateCardModal(false);
        setMsg('Rate card created successfully');
        await loadAdminData();
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Error creating rate card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
              Platform Administration
            </span>
            <span className="text-xs font-semibold text-slate-500">Authorized Access Only</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">WorkForce Admin Console</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee worker verifications, rate cards, skills catalog, and platform performance.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl">
          {(['STATS', 'WORKERS', 'RATE_CARDS', 'REQUESTS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'STATS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-500">Registered Users</span>
              <p className="text-3xl font-black text-slate-900">{stats?.totalUsers || 0}</p>
              <span className="text-[10px] text-slate-400 block">Total account profiles</span>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-500">Service Providers</span>
              <p className="text-3xl font-black text-brand-600">{stats?.totalWorkers || 0}</p>
              <span className="text-[10px] text-slate-400 block">
                {stats?.availableWorkers || 0} currently Available
              </span>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-500">Service Requests</span>
              <p className="text-3xl font-black text-indigo-600">{stats?.totalRequests || 0}</p>
              <span className="text-[10px] text-slate-400 block">
                {stats?.completedRequests || 0} Completed jobs
              </span>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-500">Pending Verifications</span>
              <p className="text-3xl font-black text-amber-600">{stats?.pendingVerifications || 0}</p>
              <span className="text-[10px] text-slate-400 block">Workers requiring review</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'WORKERS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Worker Profiles & Verification Status</h3>
            <span className="text-xs text-slate-400">{workers.length} Total Workers</span>
          </div>

          <div className="divide-y divide-slate-100">
            {workers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No registered workers found.</div>
            ) : (
              workers.map(w => (
                <div key={w.userId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">{w.name || 'Worker'}</h4>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          w.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : w.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.verificationStatus}
                      </span>
                      <span className="text-[10px] text-slate-400">UID: {w.userId.slice(0, 8)}...</span>
                    </div>

                    <p className="text-xs text-slate-600">{w.bio}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span>Area: <strong>{w.serviceArea}</strong></span>
                      <span>Experience: <strong>{w.experienceYears} yrs</strong></span>
                      <span>Skills: <strong>{w.skills.join(', ')}</strong></span>
                      <span>Rating: <strong>{w.averageRating.toFixed(1)}/5</strong></span>
                    </div>
                  </div>

                  {/* Verification Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {w.verificationStatus !== 'VERIFIED' && (
                      <button
                        onClick={() => handleVerifyWorker(w.userId, 'VERIFIED')}
                        disabled={loading}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                      >
                        Approve
                      </button>
                    )}
                    {w.verificationStatus !== 'REJECTED' && (
                      <button
                        onClick={() => handleVerifyWorker(w.userId, 'REJECTED')}
                        disabled={loading}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'RATE_CARDS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Configurable Trade Rate Cards</h3>
              <p className="text-xs text-slate-500">Used by Gemma 4 and the backend to calculate cost ranges</p>
            </div>
            <button
              onClick={() => setShowRateCardModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Rate Card</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rateCards.map(rc => (
              <div key={rc.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-xs text-slate-900">{rc.skillName}</span>
                  <span className="text-[10px] font-semibold text-slate-500">{rc.locality}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Base Labour</span>
                    <strong className="text-slate-800">₹{rc.baseLabourRate}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Min Charge</span>
                    <strong className="text-slate-800">₹{rc.minimumCharge}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Travel</span>
                    <strong className="text-slate-800">₹{rc.travelRate}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Materials</span>
                    <strong className="text-slate-800">₹{rc.indicativeMaterialsAllowance}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'REQUESTS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">All Platform Service Requests</h3>
            <span className="text-xs text-slate-400">{requests.length} Requests</span>
          </div>

          <div className="divide-y divide-slate-100">
            {requests.map(req => (
              <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{req.title}</span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">{req.description}</p>
                </div>
                <div className="text-slate-400 text-[10px] text-right shrink-0">
                  <p>{req.locality}, {req.district}</p>
                  <p>{new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Rate Card Modal */}
      {showRateCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Configure Trade Rate Card</h3>
            <form onSubmit={handleCreateRateCard} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trade Skill</label>
                <input
                  type="text"
                  required
                  value={rcSkillName}
                  onChange={e => {
                    setRcSkillName(e.target.value);
                    setRcSkillId(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Labour (₹)</label>
                  <input
                    type="number"
                    required
                    value={rcBaseLabour}
                    onChange={e => setRcBaseLabour(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Charge (₹)</label>
                  <input
                    type="number"
                    required
                    value={rcMinCharge}
                    onChange={e => setRcMinCharge(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Travel Allowance (₹)</label>
                  <input
                    type="number"
                    required
                    value={rcTravel}
                    onChange={e => setRcTravel(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Materials Allowance (₹)</label>
                  <input
                    type="number"
                    required
                    value={rcMaterials}
                    onChange={e => setRcMaterials(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRateCardModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold"
                >
                  Save Rate Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
