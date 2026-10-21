import React, { useState, useEffect } from 'react';
import { User, Supplier, SupplierPayment, PaymentMethod } from '../types.ts';
import { api } from '../services/api.ts';
import { formatAED, formatDate } from '../utils/formatters.ts';
import {
  Building2,
  Plus,
  Search,
  Filter,
  DollarSign,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit2,
  FileText,
  Phone,
  Mail,
  X,
  CreditCard,
  Wallet,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

interface SupplierManagementProps {
  currentUser: User;
  onRefreshTransactions?: () => void;
}

const SUPPLIER_CATEGORIES = [
  'Visa Typing Partner',
  'Medical Fitness Center',
  'Emirates ID Typing Center',
  'Amer / Tasheel Service Center',
  'Health Insurance Provider',
  'Legal Translation Partner',
  'Courier & Logistics',
  'Government Attestation Service',
  'General Vendor & Supplies',
];

export const SupplierManagement: React.FC<SupplierManagementProps> = ({
  currentUser,
  onRefreshTransactions,
}) => {
  const isMaster = currentUser.role === 'master_admin';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subTab, setSubTab] = useState<'suppliers' | 'vouchers'>('suppliers');

  // Filters
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentTargetSupplier, setPaymentTargetSupplier] = useState<Supplier | null>(null);

  // Form states - Supplier
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formCompanyName, setFormCompanyName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>(SUPPLIER_CATEGORIES[0]);
  const [formInitialBalance, setFormInitialBalance] = useState<string>('0');
  const [supplierSubmitting, setSupplierSubmitting] = useState<boolean>(false);

  // Form states - Payment Voucher
  const [paySupplierId, setPaySupplierId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Bank Transfer');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payDueDate, setPayDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payStatus, setPayStatus] = useState<'Paid' | 'Pending' | 'Overdue'>('Paid');
  const [payNotes, setPayNotes] = useState<string>('');
  const [payDocUrl, setPayDocUrl] = useState<string>('');
  const [paymentSubmitting, setPaymentSubmitting] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedSuppliers, fetchedPayments] = await Promise.all([
        api.getSuppliers(currentUser),
        api.getSupplierPayments(currentUser),
      ]);
      setSuppliers(Array.isArray(fetchedSuppliers) ? fetchedSuppliers : []);
      setPayments(Array.isArray(fetchedPayments) ? fetchedPayments : []);
    } catch (err: any) {
      console.error('Failed to load supplier data:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch suppliers and vouchers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setFormNameEn('');
    setFormCompanyName('');
    setFormPhone('');
    setFormEmail('');
    setFormCategory(SUPPLIER_CATEGORIES[0]);
    setFormInitialBalance('0');
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormNameEn(sup.nameEn);
    setFormCompanyName(sup.companyName);
    setFormPhone(sup.phone);
    setFormEmail(sup.email || '');
    setFormCategory(sup.category);
    setFormInitialBalance(sup.outstandingBalance.toString());
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompanyName.trim() || !formPhone.trim()) {
      setFeedback({ type: 'error', message: 'Company name and phone number are required.' });
      return;
    }

    try {
      setSupplierSubmitting(true);
      if (editingSupplier) {
        const updated = await api.updateSupplier(currentUser, editingSupplier.id, {
          nameEn: formNameEn.trim() || formCompanyName.trim(),
          companyName: formCompanyName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          category: formCategory,
          outstandingBalance: Number(formInitialBalance) || 0,
        });
        setSuppliers(prev => prev.map(s => (s.id === updated.id ? updated : s)));
        setFeedback({ type: 'success', message: `Supplier "${updated.companyName}" updated successfully.` });
      } else {
        const created = await api.createSupplier(currentUser, {
          nameEn: formNameEn.trim() || formCompanyName.trim(),
          companyName: formCompanyName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          category: formCategory,
          outstandingBalance: Number(formInitialBalance) || 0,
        });
        setSuppliers(prev => [created, ...prev]);
        setFeedback({ type: 'success', message: `Supplier "${created.companyName}" added successfully.` });
      }
      setIsSupplierModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save supplier.' });
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${sup.companyName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteSupplier(currentUser, sup.id);
      setSuppliers(prev => prev.filter(s => s.id !== sup.id));
      setPayments(prev => prev.filter(p => p.supplierId !== sup.id));
      setFeedback({ type: 'success', message: `Supplier "${sup.companyName}" deleted.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete supplier.' });
    }
  };

  const handleOpenAddPayment = (sup?: Supplier) => {
    const targetSup = sup || suppliers[0] || null;
    setPaymentTargetSupplier(targetSup);
    setPaySupplierId(targetSup ? targetSup.id : '');
    setPayAmount('');
    setPayMethod('Bank Transfer');
    setPayRefNo('');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayDueDate(new Date().toISOString().split('T')[0]);
    setPayStatus('Paid');
    setPayNotes('');
    setPayDocUrl('');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!paySupplierId || isNaN(amt) || amt <= 0) {
      setFeedback({ type: 'error', message: 'Please select a supplier and enter a valid positive amount.' });
      return;
    }

    try {
      setPaymentSubmitting(true);
      const created = await api.createSupplierPayment(currentUser, {
        supplierId: paySupplierId,
        amount: amt,
        paymentMethod: payMethod,
        referenceNo: payRefNo.trim() || undefined,
        date: payDate,
        dueDate: payDueDate,
        status: payStatus,
        notes: payNotes.trim() || undefined,
        documentUrl: payDocUrl.trim() || undefined,
      });

      setPayments(prev => [created, ...prev]);

      // If Paid, refresh suppliers list to show updated balance & refresh general transactions
      if (payStatus === 'Paid') {
        const refreshed = await api.getSuppliers(currentUser);
        setSuppliers(Array.isArray(refreshed) ? refreshed : []);
        if (onRefreshTransactions) onRefreshTransactions();
      }

      setFeedback({
        type: 'success',
        message: `Payment voucher of ${formatAED(amt)} to ${created.supplierName} recorded successfully!${
          payStatus === 'Paid' ? ' Automatically posted as company expense in General Ledger.' : ''
        }`,
      });
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record supplier payment.' });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleMarkPaymentPaid = async (pay: SupplierPayment) => {
    try {
      const updated = await api.updateSupplierPayment(currentUser, pay.id, {
        status: 'Paid',
      });
      setPayments(prev => prev.map(p => (p.id === updated.id ? updated : p)));

      // Refresh supplier balances & transaction ledger
      const refreshed = await api.getSuppliers(currentUser);
      setSuppliers(Array.isArray(refreshed) ? refreshed : []);
      if (onRefreshTransactions) onRefreshTransactions();

      setFeedback({
        type: 'success',
        message: `Payment ${pay.referenceNo || pay.id} marked as Paid. Supplier balance updated and expense posted to General Ledger!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update payment status.' });
    }
  };

  const handleDeletePayment = async (pay: SupplierPayment) => {
    if (!window.confirm(`Are you sure you want to delete payment voucher #${pay.referenceNo || pay.id}?`)) {
      return;
    }

    try {
      await api.deleteSupplierPayment(currentUser, pay.id);
      setPayments(prev => prev.filter(p => p.id !== pay.id));
      setFeedback({ type: 'success', message: 'Payment voucher deleted successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete payment voucher.' });
    }
  };

  // Calculations
  const totalPaidAllSuppliers = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
  const totalOutstandingAllSuppliers = suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);
  const pendingVouchersCount = payments.filter(p => p.status === 'Pending' || p.status === 'Overdue').length;

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter(s => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchComp = s.companyName.toLowerCase().includes(q);
      const matchName = s.nameEn.toLowerCase().includes(q);
      const matchPhone = s.phone.includes(q);
      if (!matchComp && !matchName && !matchPhone) return false;
    }
    return true;
  });

  // Filtered payments
  const filteredPayments = payments.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchSup = p.supplierName.toLowerCase().includes(q);
      const matchRef = p.referenceNo?.toLowerCase().includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q);
      if (!matchSup && !matchRef && !matchNotes) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Partners / Vendors
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{suppliers.length}</span>
            <span className="text-xs text-slate-400">active providers</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Cumulative Paid
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {formatAED(totalPaidAllSuppliers)}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outstanding Payables
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">
              {formatAED(totalOutstandingAllSuppliers)}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending / Overdue Vouchers
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 font-mono">
              {pendingVouchersCount}
            </span>
            <span className="text-xs text-slate-400">awaiting settlement</span>
          </div>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('suppliers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subTab === 'suppliers'
                ? 'bg-[#C9A05C] text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Vendors &amp; Service Partners ({suppliers.length})</span>
          </button>

          <button
            onClick={() => setSubTab('vouchers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subTab === 'vouchers'
                ? 'bg-[#C9A05C] text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Payment Vouchers ({payments.length})</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isMaster && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddSupplier}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#C9A05C]" />
              <span>+ Add Supplier</span>
            </button>
            <button
              onClick={() => handleOpenAddPayment()}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>+ Record Payment Voucher</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              subTab === 'suppliers'
                ? 'Search by vendor company name, contact, phone...'
                : 'Search by supplier, voucher reference number, notes...'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
          />
        </div>

        {subTab === 'suppliers' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-[#C9A05C]"
            >
              <option value="all">All Categories</option>
              {SUPPLIER_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {subTab === 'vouchers' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-[#C9A05C]"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
          Loading supplier ledger data...
        </div>
      ) : subTab === 'suppliers' ? (
        /* ================= VENDORS TABLE ================= */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4 text-right">Total Paid (AED)</th>
                  <th className="py-3 px-4 text-right">Outstanding (AED)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No suppliers registered yet. Click &quot;+ Add Supplier&quot; to register your first partner typing center, medical clinic, or vendor.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#C9A05C]" />
                          <span>{sup.companyName}</span>
                        </div>
                        {sup.nameEn && sup.nameEn !== sup.companyName && (
                          <div className="text-[11px] text-slate-400">Contact: {sup.nameEn}</div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono">ID: {sup.id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {sup.category}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3 h-3 text-[#C9A05C]" />
                          <span className="font-mono text-[11px]">{sup.phone}</span>
                        </div>
                        {sup.email && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{sup.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatAED(sup.totalPaid || 0)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {sup.outstandingBalance > 0 ? (
                          <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {formatAED(sup.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-slate-400">AED 0.00</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenAddPayment(sup)}
                            title="Pay Supplier"
                            className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Pay</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditSupplier(sup)}
                            title="Edit Supplier"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSupplier(sup)}
                            title="Delete Supplier"
                            className="p-1 rounded bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-900/60 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= VOUCHERS TABLE ================= */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3 px-4">Voucher / Ref #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Date / Due</th>
                  <th className="py-3 px-4 text-right">Amount (AED)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No payment vouchers found. Click &quot;+ Record Payment Voucher&quot; to issue a payment voucher.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-[#C9A05C]" />
                          <span>{p.referenceNo || p.id}</span>
                        </div>
                        {p.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.notes}</div>}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {p.supplierName}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          <CreditCard className="w-3 h-3 text-[#C9A05C]" />
                          {p.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-300">Paid: {formatDate(p.date)}</div>
                        {p.status !== 'Paid' && (
                          <div className="text-amber-400 text-[10px]">Due: {formatDate(p.dueDate)}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                        {formatAED(p.amount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            p.status === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'Overdue'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.status !== 'Paid' && (
                            <button
                              onClick={() => handleMarkPaymentPaid(p)}
                              title="Mark as Paid"
                              className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Settle</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeletePayment(p)}
                            title="Delete Voucher"
                            className="p-1 rounded bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-900/60 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT SUPPLIER ================= */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsSupplierModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-[#C9A05C]" />
              <h3 className="text-base font-bold text-white">
                {editingSupplier ? 'Edit Supplier / Vendor' : 'Register New Supplier / Vendor'}
              </h3>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al Baraka Typing Center LLC"
                  value={formCompanyName}
                  onChange={e => setFormCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mansour"
                    value={formNameEn}
                    onChange={e => setFormNameEn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone / Mobile *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +971 50 123 4567"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="partner@center.ae"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    {SUPPLIER_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Outstanding Payables / Balance (AED)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formInitialBalance}
                  onChange={e => setFormInitialBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-[#C9A05C]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Amount currently payable to this vendor for previous typing or medical batches.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supplierSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {supplierSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD PAYMENT VOUCHER ================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-[#C9A05C]" />
              <h3 className="text-base font-bold text-white">Record Supplier Payment Voucher</h3>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Supplier / Vendor *
                </label>
                <select
                  required
                  value={paySupplierId}
                  onChange={e => {
                    setPaySupplierId(e.target.value);
                    const found = suppliers.find(s => s.id === e.target.value);
                    setPaymentTargetSupplier(found || null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  <option value="">-- Select Vendor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} (Balance: AED {s.outstandingBalance.toFixed(2)})
                    </option>
                  ))}
                </select>
                {paymentTargetSupplier && (
                  <div className="mt-1 text-[11px] text-amber-400 font-mono">
                    Current outstanding balance with this vendor: {formatAED(paymentTargetSupplier.outstandingBalance)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Amount (AED) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reference / Cheque No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TR-98234 or CHQ-0021"
                    value={payRefNo}
                    onChange={e => setPayRefNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Voucher Status *
                  </label>
                  <select
                    value={payStatus}
                    onChange={e => setPayStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="Paid">Paid (Settled &amp; Log as Expense)</option>
                    <option value="Pending">Pending (Issued but not cleared)</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={payDueDate}
                    onChange={e => setPayDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Voucher Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of services paid for, invoice numbers covered, etc."
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300">
                💡 <strong>Automatic Accounting:</strong> When recorded as <em>Paid</em>, this voucher will automatically decrement the vendor&apos;s outstanding balance and post a matching expense entry to the General Ledger.
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {paymentSubmitting ? 'Recording...' : 'Record Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
