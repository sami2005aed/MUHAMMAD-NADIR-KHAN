import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { CompanySettings, PublicTrackResult } from '../types.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import { formatDate } from '../utils/formatters.ts';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  XCircle,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Calendar,
  Lock,
} from 'lucide-react';

interface TrackingPageProps {
  initialPassport?: string;
  settings: CompanySettings;
  onBackToApp?: () => void;
  onGoToVerify?: () => void;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({
  initialPassport = '',
  settings,
  onBackToApp,
  onGoToVerify,
}) => {
  const [passportInput, setPassportInput] = useState(initialPassport);
  const [result, setResult] = useState<PublicTrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const performLookup = async (passportNo: string) => {
    const clean = passportNo.trim();
    if (!clean || clean.length < 3) {
      setErrorMsg('Please enter a valid passport number (at least 3 characters).');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setSearched(true);

    try {
      const data = await api.trackPassport(clean);
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve tracking status');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPassport) {
      performLookup(initialPassport);
    }
  }, [initialPassport]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(passportInput);
  };

  const getStatusStep = (status: string) => {
    const steps = ['Pending', 'In Progress', 'Completed', 'Delivered'];
    const idx = steps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060E1E] via-[#0A1A3C] to-[#0A1224] text-white p-4 sm:p-8 flex flex-col items-center justify-between font-sans">
      {/* Top Navbar */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-6">
        <CompanyLogo size="verify" />
        <div className="flex items-center gap-2">
          {onGoToVerify && (
            <button
              onClick={onGoToVerify}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 transition cursor-pointer"
            >
              Verify Invoice
            </button>
          )}
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 my-auto">
        <div className="text-center max-w-lg mx-auto mb-6">
          <div className="w-12 h-12 bg-amber-500/10 text-[#C9A05C] rounded-2xl border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Track Visa &amp; Application Status
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status tracking for visa processing, typing jobs, and document clearances at CORE LINK Administrative Services (Ajman, UAE).
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
            <input
              type="text"
              required
              value={passportInput}
              onChange={e => setPassportInput(e.target.value.toUpperCase())}
              placeholder="Enter Passport Number (e.g. N12345678)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono tracking-wider focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? 'Checking...' : 'Track Application'}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-center max-w-lg mx-auto mb-6">
            {errorMsg}
          </div>
        )}

        {/* Results View */}
        {searched && !loading && result && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {result.found ? (
              <>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-sm text-emerald-200 block">
                        Active Applications Found
                      </span>
                      <span className="text-xs text-slate-400">
                        Passport No: <strong className="font-mono text-white">{result.passportNo}</strong>
                        {(result.clientNameMasked || result.clientName) && (
                          <span className="ml-2 font-mono text-amber-300">({result.clientNameMasked || result.clientName})</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-950 border border-emerald-500/40 text-emerald-300">
                    {result.jobs.length} Active Job(s)
                  </span>
                </div>

                {/* Job Cards */}
                <div className="space-y-3">
                  {result.jobs.map((job: any) => {
                    const currentStep = getStatusStep(job.status);
                    const steps = ['Pending Review', 'In Progress', 'Completed', 'Delivered'];

                    return (
                      <div
                        key={job.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-[#C9A05C] uppercase font-bold tracking-wider">
                              Job #{job.id}
                            </span>
                            <h3 className="text-sm font-bold text-white mt-0.5">{job.type}</h3>
                            {job.description && (
                              <p className="text-xs text-slate-400 mt-1">{job.description}</p>
                            )}
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border uppercase self-start sm:self-auto ${
                              job.status === 'Completed' || job.status === 'Delivered'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : job.status === 'In Progress'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>

                        {/* Step Progress Bar */}
                        <div className="pt-2">
                          <div className="grid grid-cols-4 gap-2">
                            {steps.map((st, sIdx) => {
                              const isCompleted = sIdx <= currentStep;
                              const isCurrent = sIdx === currentStep;
                              return (
                                <div key={st} className="space-y-1">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      isCompleted
                                        ? 'bg-gradient-to-r from-[#C9A05C] to-amber-500'
                                        : 'bg-slate-800'
                                    }`}
                                  />
                                  <span
                                    className={`block text-[10px] font-semibold text-center ${
                                      isCurrent
                                        ? 'text-amber-300 font-bold'
                                        : isCompleted
                                        ? 'text-slate-300'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {st}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dates info */}
                        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
                          <div>
                            <span className="block text-slate-500 text-[10px]">Submitted Date:</span>
                            <span className="font-mono text-slate-300">{formatDate(job.createdAt)}</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px]">Estimated Due Date:</span>
                            <span className="font-mono text-slate-300">
                              {job.dueDate ? formatDate(job.dueDate) : 'Standard Turnaround'}
                            </span>
                          </div>
                          {job.completedAt && (
                            <div>
                              <span className="block text-slate-500 text-[10px]">Completion Date:</span>
                              <span className="font-mono text-emerald-400">{formatDate(job.completedAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Document review badges */}
                        {job.documents && job.documents.length > 0 && (
                          <div className="pt-2 border-t border-slate-900">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                              Submitted Supporting Papers:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {job.documents.map((d: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                                >
                                  <FileText className="w-3 h-3 text-[#C9A05C]" />
                                  <span>{d.name}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
                                    {d.status || 'Received'}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Privacy & Confidentiality Notice */}
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock className="w-4 h-4 text-[#C9A05C] shrink-0" />
                  <span>
                    Privacy Shield Enabled: Financial balances, government receipts, and commissions are restricted to authorized accounts and never displayed publicly.
                  </span>
                </div>
              </>
            ) : (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">No Active Jobs Found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  We could not find active applications matching passport number{' '}
                  <strong className="font-mono text-amber-300">{result.passportNo}</strong>.
                  Please verify your passport number or contact CORE LINK support (068055093).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 mt-6 space-y-1">
        <div>CORE LINK BUSINESS SERVICES • Ajman, United Arab Emirates • License No: {settings.licenseNo}</div>
        <div>Official Visa &amp; Government Application Status Portal</div>
      </div>
    </div>
  );
};
