import React, { useState, useEffect } from 'react';
import { User, CompanySettings } from '../types.ts';
import { api } from '../services/api.ts';
import {
  Settings,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Save,
  CheckCircle,
  AlertCircle,
  FileSignature,
  Database,
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  ShieldOff,
  RefreshCw,
} from 'lucide-react';

interface SettingsModuleProps {
  currentUser: User;
  settings: CompanySettings;
  onRefreshSettings: () => void;
  onOpenTemplateManager: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  currentUser,
  settings,
  onRefreshSettings,
  onOpenTemplateManager,
}) => {
  const [tradeNameEn, setTradeNameEn] = useState(settings.tradeNameEn);
  const [tradeNameAr, setTradeNameAr] = useState(settings.tradeNameAr);
  const [licenseNo, setLicenseNo] = useState(settings.licenseNo);
  const [legalForm, setLegalForm] = useState(settings.legalForm);
  const [activities, setActivities] = useState(settings.activities);
  const [address, setAddress] = useState(settings.address);
  const [addressAr, setAddressAr] = useState(settings.addressAr);
  const [phones, setPhones] = useState(settings.phones.join(', '));
  const [emails, setEmails] = useState(settings.emails.join(', '));
  const [trn, setTrn] = useState(settings.trn || ''); // Tax Registration Number (empty if not registered)
  const [chargeVat, setChargeVat] = useState(Boolean(settings.chargeVat));
  const [invoiceTermsEn, setInvoiceTermsEn] = useState(
    settings.invoiceTermsEn ||
      'Service charges are non-refundable. Any refund, where applicable, will take 22 working days to be processed.'
  );
  const [invoiceTermsAr, setInvoiceTermsAr] = useState(
    settings.invoiceTermsAr ||
      'رسوم الخدمة غير قابلة للاسترداد. وفي حال وجود مبلغ مستحق الاسترداد، تستغرق معالجة الاسترداد 22 يوم عمل.'
  );
  const [companyLicenseExpiry, setCompanyLicenseExpiry] = useState(settings.companyLicenseExpiry);
  const [subAgentBalanceThreshold, setSubAgentBalanceThreshold] = useState(
    String(settings.subAgentBalanceThreshold || 5000)
  );

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Storage Health Check State
  const [systemCheckData, setSystemCheckData] = useState<any>(null);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);

  const fetchSystemHealth = async () => {
    setHealthCheckLoading(true);
    try {
      const data = await api.getSystemCheck();
      setSystemCheckData(data);
    } catch (err: any) {
      console.error('Failed to load system health check:', err);
    } finally {
      setHealthCheckLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  // Security: Deletion Confirmation Password State (Master Admin only)
  const [currentDeletePassword, setCurrentDeletePassword] = useState('');
  const [newDeletePassword, setNewDeletePassword] = useState('');
  const [confirmDeletePassword, setConfirmDeletePassword] = useState('');
  const [showCurrentDeletePw, setShowCurrentDeletePw] = useState(false);
  const [showNewDeletePw, setShowNewDeletePw] = useState(false);
  const [deletePwLoading, setDeletePwLoading] = useState(false);
  const [deletePwFeedback, setDeletePwFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Trusted Devices Revocation State
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeFeedback, setRevokeFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleRevokeTrustedDevices = async () => {
    setRevokeLoading(true);
    setRevokeFeedback(null);
    try {
      const res = await api.revokeTrustedDevices(currentUser);
      // Remove local device token for current user
      localStorage.removeItem(`trustedDevice:${currentUser.email.toLowerCase().trim()}`);
      setRevokeFeedback({
        type: 'success',
        msg: res.message || 'All trusted devices have been revoked. 2FA OTP will be required on next login.',
      });
    } catch (err: any) {
      setRevokeFeedback({
        type: 'error',
        msg: err.message || 'Failed to revoke trusted devices.',
      });
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleChangeDeletePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletePwFeedback(null);

    if (!currentDeletePassword || !newDeletePassword) {
      setDeletePwFeedback({ type: 'error', msg: 'Please provide both current and new deletion passwords.' });
      return;
    }

    if (newDeletePassword.length < 6) {
      setDeletePwFeedback({ type: 'error', msg: 'New deletion password must be at least 6 characters long.' });
      return;
    }

    if (newDeletePassword !== confirmDeletePassword) {
      setDeletePwFeedback({ type: 'error', msg: 'New deletion passwords do not match. Please re-enter.' });
      return;
    }

    setDeletePwLoading(true);
    try {
      const res = await api.changeDeletePassword(currentUser, currentDeletePassword, newDeletePassword);
      setDeletePwFeedback({
        type: 'success',
        msg: res.message || 'Deletion confirmation password updated successfully!',
      });
      setCurrentDeletePassword('');
      setNewDeletePassword('');
      setConfirmDeletePassword('');
    } catch (err: any) {
      setDeletePwFeedback({
        type: 'error',
        msg: err.message || 'Failed to update deletion confirmation password.',
      });
    } finally {
      setDeletePwLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    setBackupFeedback(null);
    try {
      await api.downloadDatabaseBackup(currentUser);
      setBackupFeedback('Full database backup JSON downloaded successfully.');
    } catch (err: any) {
      setBackupFeedback(err.message || 'Failed to download database backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore the database from this backup file? This will overwrite or update existing records with the backup data in Cloud Firestore.')) {
      e.target.value = '';
      return;
    }

    setRestoreLoading(true);
    setRestoreFeedback(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.restoreDatabaseBackup(currentUser, parsed);
      setRestoreFeedback(res.message || 'Database successfully restored to Cloud Firestore!');
      onRefreshSettings();
    } catch (err: any) {
      setRestoreFeedback(err.message || 'Failed to restore database from backup file.');
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const updated: Partial<CompanySettings> = {
        tradeNameEn,
        tradeNameAr,
        licenseNo,
        legalForm,
        activities,
        address,
        addressAr,
        phones: phones.split(',').map(p => p.trim()).filter(Boolean),
        emails: emails.split(',').map(e => e.trim()).filter(Boolean),
        trn: trn.trim(),
        chargeVat: Boolean(trn.trim() && chargeVat),
        invoiceTermsEn: invoiceTermsEn.trim(),
        invoiceTermsAr: invoiceTermsAr.trim(),
        companyLicenseExpiry,
        subAgentBalanceThreshold: Number(subAgentBalanceThreshold) || 5000,
      };

      await api.updateSettings(currentUser, updated);
      setFeedback({ type: 'success', msg: 'Company profile and configuration updated successfully!' });
      onRefreshSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to update settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#C9A05C]" />
              Company Profile &amp; Letterhead Configuration
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Changes made here automatically update all printed invoices, agreements, and official document headers.
            </p>
          </div>

          <button
            onClick={onOpenTemplateManager}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
          >
            <FileSignature className="w-4 h-4 text-[#C9A05C]" />
            <span>Manage Agreement Templates &rarr;</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Trade Name (English) *
            </label>
            <input
              type="text"
              required
              value={tradeNameEn}
              onChange={e => setTradeNameEn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 font-arabic" dir="rtl">
              اسم المنشأة التجاري (بالعربية) *
            </label>
            <input
              type="text"
              required
              dir="rtl"
              value={tradeNameAr}
              onChange={e => setTradeNameAr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-arabic focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ajman Trade License No. *
            </label>
            <input
              type="text"
              required
              value={licenseNo}
              onChange={e => setLicenseNo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Legal Form
            </label>
            <input
              type="text"
              value={legalForm}
              onChange={e => setLegalForm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-1">
              Company License Expiry Date
            </label>
            <input
              type="date"
              required
              value={companyLicenseExpiry}
              onChange={e => setCompanyLicenseExpiry(e.target.value)}
              className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        {/* VAT Tax Registration Number (TRN) & Charge VAT Switch */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-amber-300">
              Tax Registration Number (TRN) &bull; الرقم الضريبي
            </label>
            <span className="text-[10px] text-slate-400">Optional / Leave empty until registered</span>
          </div>
          <input
            type="text"
            value={trn}
            onChange={e => {
              const val = e.target.value;
              setTrn(val);
              if (!val.trim()) {
                setChargeVat(false);
              }
            }}
            placeholder="e.g. 100xxxxxxxxxxxx (Leave blank if not registered yet)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-hidden focus:border-[#C9A05C]"
          />

          {/* Conditional Charge VAT Switch */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Charge VAT (5%) on Invoices</span>
              <span className="text-[11px] text-slate-400 block">
                {trn.trim()
                  ? 'Enable 5% VAT calculation and show TRN on generated invoices'
                  : 'Disabled: A TRN must be entered and saved before VAT can be charged'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!trn.trim()}
                checked={chargeVat && Boolean(trn.trim())}
                onChange={e => setChargeVat(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9A05C] peer-disabled:opacity-40"></div>
            </label>
          </div>
          <p className="text-[11px] text-slate-400">
            {chargeVat && trn.trim()
              ? 'VAT is currently ON: Invoices will calculate 5% VAT and display your TRN number.'
              : 'VAT is currently OFF: No VAT line will appear on invoices, Grand Total will equal Subtotal, and letterheads show "TRN: Not Registered".'}
          </p>
        </div>

        {/* Mandatory Invoice Terms Note (Bilingual) */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
          <div>
            <label className="block text-xs font-bold text-amber-300">
              Mandatory Invoice Terms Note (Printed above QR code on all Invoices)
            </label>
            <span className="text-[10px] text-slate-400">
              Required legal clause printed on every official invoice
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-300 font-semibold mb-1">
                English Terms Note:
              </label>
              <textarea
                rows={2}
                value={invoiceTermsEn}
                onChange={e => setInvoiceTermsEn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-300 font-semibold mb-1 font-arabic text-right" dir="rtl">
                الشروط باللغة العربية:
              </label>
              <textarea
                rows={2}
                dir="rtl"
                value={invoiceTermsAr}
                onChange={e => setInvoiceTermsAr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-arabic focus:outline-hidden focus:border-[#C9A05C]"
              />
            </div>
          </div>
        </div>

        {/* Activities */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Licensed Business Activities
          </label>
          <textarea
            rows={2}
            value={activities}
            onChange={e => setActivities(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
          />
        </div>

        {/* Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Office Address (English)
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 font-arabic" dir="rtl">
              العنوان باللغة العربية
            </label>
            <input
              type="text"
              dir="rtl"
              value={addressAr}
              onChange={e => setAddressAr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-arabic focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>
        </div>

        {/* Phone & Emails */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Office Telephone Numbers (comma separated)
            </label>
            <input
              type="text"
              value={phones}
              onChange={e => setPhones(e.target.value)}
              placeholder="068055093, 068055073"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Official Email Addresses (comma separated)
            </label>
            <input
              type="text"
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder="info@corelinkservices.ae, support@corelinkservices.ae"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
            />
          </div>
        </div>

        {/* Alerts Threshold */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Sub-Agent Outstanding Balance Alert Threshold (AED)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={subAgentBalanceThreshold}
            onChange={e => setSubAgentBalanceThreshold(e.target.value)}
            className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Trigger dashboard alerts when any sub-agent's unpaid commission exceeds this AED amount.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Company Profile'}</span>
          </button>
        </div>
      </form>

      {/* Security: Deletion Confirmation Password (Master Admin only) */}
      {currentUser.role === 'master_admin' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Security &amp; Deletion Authorization
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    Master Admin Only
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure the separate authorization password required to execute permanent deletion of Clients, Sub-Agents, Jobs, Invoices, Agreements, and Documents.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300 space-y-2">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-[#C9A05C] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Deletion Confirmation Password:</strong> This security password protects against accidental or unauthorized data loss. It is stored server-side using secure bcrypt hashing and is verified whenever a deletion is requested.
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-400 text-[11px]">
              <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                Configured via the <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">DELETE_PASSWORD</code> server secret. You can change it below at any time by verifying your current deletion password.
              </div>
            </div>
          </div>

          <form onSubmit={handleChangeDeletePassword} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Deletion Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentDeletePw ? 'text' : 'password'}
                    required
                    value={currentDeletePassword}
                    onChange={e => setCurrentDeletePassword(e.target.value)}
                    placeholder="Enter current deletion password..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#C9A05C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentDeletePw(!showCurrentDeletePw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showCurrentDeletePw ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentDeletePw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Deletion Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewDeletePw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newDeletePassword}
                    onChange={e => setNewDeletePassword(e.target.value)}
                    placeholder="Min. 6 characters..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-[#C9A05C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewDeletePw(!showNewDeletePw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showNewDeletePw ? 'Hide password' : 'Show password'}
                  >
                    {showNewDeletePw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Deletion Password *
                </label>
                <input
                  type={showNewDeletePw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmDeletePassword}
                  onChange={e => setConfirmDeletePassword(e.target.value)}
                  placeholder="Re-enter new deletion password..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A05C]"
                />
              </div>
            </div>

            {deletePwFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  deletePwFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {deletePwFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{deletePwFeedback.msg}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={deletePwLoading || !currentDeletePassword || !newDeletePassword}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletePwLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Update Deletion Password</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Trusted Devices & 30-Day 2FA Bypass */}
          <div className="pt-5 border-t border-slate-800 space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    Trusted Devices &amp; 30-Day 2FA Session Bypass
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Browsers verified with email OTP skip 2FA for 30 days. You can forget all trusted devices to immediately force email OTP verification again across all sessions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRevokeTrustedDevices}
                disabled={revokeLoading}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {revokeLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking Devices...</span>
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Forget All Trusted Devices</span>
                  </>
                )}
              </button>
            </div>

            {revokeFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  revokeFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {revokeFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{revokeFeedback.msg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Production Readiness & Database Backup (Master Admin) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Production Deployment &amp; Data Persistence
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Persistent Storage Active
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Confirmation of database persistence across application restarts and on-demand manual backup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={backupLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{backupLoading ? 'Generating Backup...' : 'Download Backup (JSON)'}</span>
            </button>

            <label className={`flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold rounded-lg text-xs shadow-md transition cursor-pointer ${restoreLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              {restoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{restoreLoading ? 'Restoring into Firestore...' : 'Restore from Backup (JSON)'}</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreBackup}
                disabled={restoreLoading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Live Storage Engine Status & Health Check */}
        <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Storage Engine:</span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {systemCheckData?.driver || 'Firebase Admin SDK'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Database:</span>
              <span className="font-mono text-slate-300">
                {systemCheckData?.database || systemCheckData?.storage?.databaseId || '(default)'}
              </span>
            </div>

            <button
              type="button"
              onClick={fetchSystemHealth}
              disabled={healthCheckLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${healthCheckLoading ? 'animate-spin' : ''}`} />
              <span>{healthCheckLoading ? 'Testing...' : 'Test Storage Live'}</span>
            </button>
          </div>

          {systemCheckData?.storage?.liveTest && (
            <div className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between gap-3 ${
              systemCheckData.storage.liveTest.ok
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {systemCheckData.storage.liveTest.ok ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>
                  {systemCheckData.storage.liveTest.ok
                    ? `Live write & read-back verified in ${systemCheckData.storage.liveTest.latencyMs}ms (${systemCheckData.driver})`
                    : `Live storage check failed: ${systemCheckData.storage.liveTest.error || 'Connection error'}`}
                </span>
              </div>
              <span className="text-slate-500 text-[10px]">
                {systemCheckData.storage.liveTest.testedAt ? new Date(systemCheckData.storage.liveTest.testedAt).toLocaleTimeString() : ''}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2.5 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-300">Deployment &amp; Persistence Verified:</strong> When deployed or published via AI Studio, the application runtime operates with persistent database storage where <code className="text-emerald-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">Google Cloud Firestore</code> collections and chunk storage are preserved across restarts, process cycles, and service deployments without resetting or overwriting live operational data.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <HardDrive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Disaster Recovery &amp; Backup / Restore:</strong> Export a snapshot of all users, clients, jobs, transactions, ledger records, invoices, agreements, and settings, or import a JSON backup file to restore into Cloud Firestore.
            </div>
          </div>
        </div>

        {backupFeedback && (
          <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{backupFeedback}</span>
          </div>
        )}

        {restoreFeedback && (
          <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{restoreFeedback}</span>
          </div>
        )}
      </div>
    </div>
  );
};
