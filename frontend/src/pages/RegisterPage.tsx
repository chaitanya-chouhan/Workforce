import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Wrench,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Upload,
  Info,
} from 'lucide-react';

const SERVICE_CATEGORIES = [
  'Electrical and Wiring',
  'Plumbing',
  'Carpentry & Woodwork',
  'Appliance Repair',
  'Painting & Finishing',
  'Deep Cleaning',
  'Masonry & Civil',
  'General Maintenance',
];

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'WORKER'>('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [locality, setLocality] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Madhya Pradesh');

  // Worker-specific fields
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState<number>(2);
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(300);
  const [minimumVisitFee, setMinimumVisitFee] = useState<number>(150);

  // Identity document upload
  const [docFile, setDocFile] = useState<File | null>(null);
  const [maskedAadhaar, setMaskedAadhaar] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = skillInput.trim().replace(/^,+|,+$/g, '');
      if (trimmed && !skills.includes(trimmed)) {
        setSkills([...skills, trimmed]);
        setSkillInput('');
      }
    }
  };

  const removeSkill = (s: string) => {
    setSkills(skills.filter(item => item !== s));
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Identity document must be smaller than 5 MB.');
        return;
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowed.includes(file.type)) {
        setError('Only JPEG, PNG, WebP images or PDF files are accepted.');
        return;
      }
      setDocFile(file);
      setError(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'WORKER' && selectedCategories.length === 0) {
      setError('Please select at least one service category for your trade.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createdUser = await register({
        name: name.trim(),
        email: email.trim(),
        pass: password,
        role,
        phone: phone.trim() || undefined,
        locality: locality.trim() || 'General Locality',
        district: district.trim() || 'Central District',
        state: state.trim() || 'State',
        skills: role === 'WORKER' ? (skills.length > 0 ? skills : selectedCategories) : undefined,
        serviceCategories: role === 'WORKER' ? selectedCategories : undefined,
        experienceYears: role === 'WORKER' ? Number(experienceYears) : undefined,
        bio: role === 'WORKER' ? bio.trim() || undefined : undefined,
        hourlyRate: role === 'WORKER' ? Number(hourlyRate) : undefined,
        minimumVisitFee: role === 'WORKER' ? Number(minimumVisitFee) : undefined,
      });

      // If worker submitted an identity document now, upload it to the secure private storage
      if (role === 'WORKER' && docFile) {
        try {
          const formData = new FormData();
          formData.append('document', docFile);
          formData.append('documentType', 'AADHAAR');
          if (maskedAadhaar) {
            formData.append('maskedAadhaar', maskedAadhaar.trim());
          }
          await api.uploadIdentityDocument(formData);
        } catch (uploadErr: any) {
          console.warn('[Doc Upload during Reg] Failed to upload doc:', uploadErr);
          // Don't fail the whole registration if upload can be completed in dashboard
        }
      }

      if (createdUser.role === 'WORKER') {
        navigate('/worker', { replace: true });
      } else {
        navigate('/customer', { replace: true });
      }
    } catch (err: any) {
      console.error('[Registration Error]', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use letters and numbers.');
      } else {
        setError(err.message || 'Registration failed. Please check your information.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-brand-500/20">
            <Wrench className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Your Account</h2>
          <p className="text-xs text-slate-500">Join the WorkForce community platform</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Select Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('CUSTOMER')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${
                  role === 'CUSTOMER'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                Customer / Household
              </button>
              <button
                type="button"
                onClick={() => setRole('WORKER')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${
                  role === 'WORKER'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                Service Provider / Worker
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {role === 'CUSTOMER'
                ? 'Request household repairs and view Gemma 4 diagnostic explanations.'
                : 'Offer trades, submit identity document for verification, and confirm jobs via OTP.'}
            </p>
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ramesh Sharma"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Phone & Location Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Locality / Area</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={locality}
                  onChange={e => setLocality(e.target.value)}
                  placeholder="e.g. Bagmugaliya"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">District / City</label>
              <input
                type="text"
                required
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="e.g. Bhopal"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* WORKER DETAILS SECTION */}
          {role === 'WORKER' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Worker Profile & Verification Details</h3>
              </div>

              {/* Service Categories */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Service Categories You Provide <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {SERVICE_CATEGORIES.map(cat => (
                    <label
                      key={cat}
                      className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-medium'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Skills Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Skills (Type & press Enter)
                </label>
                <input
                  type="text"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  placeholder="e.g. Switchboard wiring, MCB replacement, Pipe leakage"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                />
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map(s => (
                      <span
                        key={s}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(s)}
                          className="ml-1 text-brand-600 hover:text-brand-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience and Rates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={e => setExperienceYears(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Visit Fee (₹)</label>
                  <input
                    type="number"
                    min="50"
                    step="25"
                    value={minimumVisitFee}
                    onChange={e => setMinimumVisitFee(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Short Bio / Trade Background</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Certified electrician with 5+ years experience in domestic wiring, DB repairs, and fan servicing."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                />
              </div>

              {/* Aadhaar / Identity Verification Notice and Upload */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span>Aadhaar / Government Identity Verification</span>
                </div>

                {/* Privacy & Purpose Disclosure */}
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 space-y-1 leading-relaxed">
                  <div className="flex items-center space-x-1.5 font-bold text-blue-950">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Identity Verification & Privacy Policy Notice</span>
                  </div>
                  <p>
                    <strong>Why requested:</strong> To ensure community safety and establish trusted service relationships.
                  </p>
                  <p>
                    <strong>How used & who has access:</strong> Exclusively reviewed by authorized platform administrators. Documents are kept in private, access-controlled server storage and will <em>never</em> be made publicly accessible.
                  </p>
                  <p>
                    <strong>Retention:</strong> Retained securely during your active account tenure and deleted upon account termination.
                  </p>
                  <p className="text-blue-950 font-semibold pt-1">
                    🔒 Recommended: Upload a <u>Masked Aadhaar</u> (where only the last 4 digits are visible), as recommended by UIDAI guidelines.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Upload Aadhaar / Govt ID (JPEG/PNG/PDF &le;5MB)
                    </label>
                    <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-600 text-center">
                        {docFile ? docFile.name : 'Click to select document'}
                      </span>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Masked Aadhaar Last 4 Digits (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={maskedAadhaar}
                      onChange={e => setMaskedAadhaar(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9812"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      You can also upload this document later from your Worker Dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center space-x-2 pt-3"
          >
            <span>{loading ? 'Creating Your Account...' : 'Complete Registration'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
