import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { CompanySettings, VerificationLookupResult } from '../types.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import { maskName, formatDate, formatAED } from '../utils/formatters.ts';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Building2,
  Calendar,
  FileText,
  Receipt,
  ArrowLeft,
} from 'lucide-react';

interface VerificationPageProps {
  initialSerial?: string;
  settings: CompanySettings;
  onBackToApp?: () => void;
  onGoToTrack?: () => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  initialSerial = '',
  settings,
  onBackToApp,
  onGoToTrack,
}) => {
  const [serialInput, setSerialInput] = useState(initialSerial);
  const [result, setResult] = useState<VerificationLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performLookup = async (serial: string) => {
    if (!serial.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.verifyDocument(serial.trim());
      setResult(data);
    } catch (err: any) {
      setResult({
        found: false,
        serialNo: serial,
        status: 'Error retrieving verification status',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSerial) {
      performLookup(initialSerial);
    }
  }, [initialSerial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(serialInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060E1E] via-[#0A1A3C] to-[#0A1224] text-white p-4 sm:p-8 flex flex-col items-center justify-between">
      {/* Top Navbar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <CompanyLogo size="verify" />
        <div className="flex items-center gap-2">
          {onGoToTrack && (
            <button
              onClick={onGoToTrack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 text-xs font-semibold text-cyan-300 border border-cyan-700/60 transition cursor-pointer"
            >
              <span>Track Passport / Visa &rarr;</span>
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

      {/* Main Verification Card */}
      <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
        <div className="text-center max-w-md mx-auto mb-6">
          <div className="w-12 h-12 bg-amber-500/10 text-[#C9A05C] rounded-2xl border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Official Document Verification
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Verify the authenticity of invoices, typing service agreements, and contracts issued by CORE LINK Administrative Services (Ajman, UAE).
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-lg mx-auto mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              required
              value={serialInput}
              onChange={e => setSerialInput(e.target.value)}
              placeholder="e.g. CL-INV-2026-0001 or CL-AGR-2026-0001"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 uppercase font-mono tracking-wider focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        {/* Results Area */}
        {searched && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            {result?.found ? (
              <div className="bg-slate-950/90 border border-emerald-500/50 rounded-2xl shadow-xl overflow-hidden space-y-0">
                {/* Full-width dominant Green Status Banner at the very top */}
                <div className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white p-4 sm:p-5 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                        <CheckCircle className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-xs">
                            Genuine Document Confirmed
                          </span>
                        </div>
                        <div className="text-xs font-medium text-emerald-100 mt-0.5">
                          Registered &amp; Verified in Official Government Compliance Database
                        </div>
                      </div>
                    </div>
                    <span className="self-start sm:self-center px-3.5 py-1.5 rounded-full text-xs font-black bg-white text-emerald-900 shadow-sm uppercase tracking-wider">
                      {result.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Details Table */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Document Type</span>
                    <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                      {result.documentType === 'Invoice' ? (
                        <Receipt className="w-3.5 h-3.5 text-[#C9A05C]" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#C9A05C]" />
                      )}
                      {result.documentType}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Serial / Reference Number</span>
                    <span className="font-mono font-bold text-amber-300">{result.serialNo}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Beneficiary / Client Name</span>
                    <span className="font-semibold text-slate-200">
                      {result.clientNameEn ? maskName(result.clientNameEn) : 'Confidential'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Issuance Date</span>
                    <span className="text-slate-200">{formatDate(result.issueDate)}</span>
                  </div>

                  {result.amount !== undefined && (
                    <div className="col-span-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Total Invoiced Consideration:</span>
                      <span className="font-bold text-sm text-emerald-400 font-mono">
                        {formatAED(result.amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Issuer Attestation */}
                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C9A05C]" />
                    <span>Issued by {settings.tradeNameEn} (License #{settings.licenseNo})</span>
                  </div>
                  <span>Ajman, UAE</span>
                </div>
              </div>
            </div>
            ) : (
              <div className="p-6 bg-slate-950/80 border border-rose-500/40 rounded-xl text-center space-y-2">
                <XCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <h4 className="text-sm font-bold text-rose-300">Document Record Not Found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No registered document matches serial number <strong>"{result?.serialNo || serialInput}"</strong>. Please verify the serial number printed on your letterhead or contact CORE LINK support (068055093).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick sample chips */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Try Sample Serials:</span>
          <button
            type="button"
            onClick={() => {
              setSerialInput('CL-INV-2026-0001');
              performLookup('CL-INV-2026-0001');
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[#C9A05C] font-mono cursor-pointer"
          >
            CL-INV-2026-0001
          </button>
          <button
            type="button"
            onClick={() => {
              setSerialInput('CL-AGR-2026-0001');
              performLookup('CL-AGR-2026-0001');
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono cursor-pointer"
          >
            CL-AGR-2026-0001
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <div>CORE LINK Administrative Services &bull; Trade License No. 140290 &bull; Ajman, UAE</div>
        <div className="mt-0.5">Phone: 068055093 / 068055073 &bull; info@corelinkservices.ae</div>
      </div>
    </div>
  );
};
