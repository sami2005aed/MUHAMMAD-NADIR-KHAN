import React, { useState } from 'react';
import {
  User,
  Transaction,
  Job,
  Client,
  TransactionType,
  PaymentMethod,
} from '../types.ts';
import { api } from '../services/api.ts';
import { formatAED, formatDate } from '../utils/formatters.ts';
import { EXPENSE_CATEGORIES, SERVICE_CATEGORIES } from '../constants.ts';
import { SupplierManagement } from './SupplierManagement.tsx';
import {
  WalletCards,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Download,
  Filter,
  Search,
  Building2,
  Calendar,
  X,
  CreditCard,
  PieChart as PieIcon,
  Coins,
} from 'lucide-react';

interface FinancialModuleProps {
  currentUser: User;
  transactions: Transaction[];
  jobs: Job[];
  clients: Client[];
  subAgents: User[];
  onRefreshTransactions: () => void;
}

export const FinancialModule: React.FC<FinancialModuleProps> = ({
  currentUser,
  transactions = [],
  jobs = [],
  clients = [],
  subAgents = [],
  onRefreshTransactions,
}) => {
  const isMaster = currentUser.role === 'master_admin';
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeSubAgents = Array.isArray(subAgents) ? subAgents : [];

  const [activeTab, setActiveTab] = useState<'daily' | 'ledger' | 'suppliers'>('daily');
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAgentLedger, setSelectedAgentLedger] = useState<string>(
    isMaster ? 'all' : currentUser.id
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [payerName, setPayerName] = useState<string>('');
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);

  // Transaction entry modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txnType, setTxnType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<string>('Visa Services');
  const [amount, setAmount] = useState<string>('');
  const [saleCost, setSaleCost] = useState<string>('0');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [relatedClientId, setRelatedClientId] = useState<string>('');
  const [relatedAgentId, setRelatedAgentId] = useState<string>('');
  const [relatedJobId, setRelatedJobId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Income categories
  const incomeCategories = [
    'Visa Services',
    'Typing & Document Photocopying',
    'Trade License Services',
    'Golden Visa Services',
    'Invoiced Services',
    'Consultancy & Administrative Fees',
    'Miscellaneous Income',
  ];

  // Current category options based on txnType
  const currentCategoryList = txnType === 'income' ? incomeCategories : EXPENSE_CATEGORIES;

  // Selected day calculations
  const selectedDayTransactions = safeTransactions.filter(t => {
    if (!isMaster && t.relatedAgentId !== currentUser.id) return false;
    return t.date === selectedDay;
  });

  const selectedDaySales = selectedDayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const selectedDayExpenses = selectedDayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const selectedDayProfit = selectedDaySales - selectedDayExpenses;

  // Last 30 days rolling ledger
  const todayObj = new Date();
  const last30Days = Array.from({ length: 30 }, (_, index) => {
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() - index);
    const dayStr = d.toISOString().split('T')[0];
    const dayTxns = safeTransactions.filter(t => {
      if (!isMaster && t.relatedAgentId !== currentUser.id) return false;
      return t.date === dayStr;
    });
    const sales = dayTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = dayTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const profit = sales - expenses;

    return {
      date: dayStr,
      dateFormatted: formatDate(dayStr),
      sales,
      expenses,
      profit,
      count: dayTxns.length,
    };
  });

  // Filtered transactions for General Ledger view
  const filteredTransactions = safeTransactions.filter(t => {
    // If sub-agent, only see related to them
    if (!isMaster && t.relatedAgentId !== currentUser.id) return false;

    // Filter by specific sub-agent ledger
    if (selectedAgentLedger !== 'all' && t.relatedAgentId !== selectedAgentLedger) {
      return false;
    }

    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchCat = t.category.toLowerCase().includes(term);
      const matchNotes = t.notes && t.notes.toLowerCase().includes(term);
      const matchMethod = t.method.toLowerCase().includes(term);
      if (!matchCat && !matchNotes && !matchMethod) return false;
    }

    return true;
  });

  // Calculate Totals for General Ledger
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

  // Selected agent running ledger metrics
  const activeAgent = safeSubAgents.find(a => a.id === selectedAgentLedger);
  const pendingApprovalTxns = safeTransactions.filter(t => t.approvalStatus === 'pending_approval');
  const agentJobs = safeJobs.filter(j => j.agentId === selectedAgentLedger);
  const totalAgentCommissionEarned = agentJobs.reduce((sum, j) => sum + (j.commissionAmount || 0), 0);
  const totalAgentPayoutsReceived = safeTransactions
    .filter(
      t =>
        t.relatedAgentId === selectedAgentLedger &&
        (t.category === 'Sub-Agent Commission Payouts' || t.type === 'expense')
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const outstandingCommission = totalAgentCommissionEarned - totalAgentPayoutsReceived;

  // Category breakdown for expenses
  const expenseByCategory: Record<string, number> = {};
  filteredTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

  // Helper to determine cost for a sale transaction (checks direct cost property or linked expense)
  const getSaleCost = (txn: Transaction): number => {
    if (txn.type !== 'income') return 0;
    if (txn.cost !== undefined && txn.cost > 0) return txn.cost;
    if (txn.linkedExpenseId) {
      const exp = transactions.find(t => t.id === txn.linkedExpenseId);
      if (exp) return exp.amount;
    }
    const linked = transactions.find(t => t.type === 'expense' && t.linkedIncomeId === txn.id);
    if (linked) return linked.amount;
    return 0;
  };

  const handleOpenAddModal = (defaultType: TransactionType = 'income', presetDate?: string) => {
    setTxnType(defaultType);
    setCategory(defaultType === 'income' ? incomeCategories[0] : EXPENSE_CATEGORIES[0]);
    setAmount('');
    setSaleCost('0');
    setMethod('Cash');
    setPayerName('');
    setRelatedClientId('');
    setRelatedAgentId('');
    setRelatedJobId('');
    setDate(presetDate || selectedDay || new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleApprovePayment = async (txnId: string) => {
    try {
      setApprovalLoadingId(txnId);
      await api.approveTransaction(currentUser, txnId, 'approve');
      onRefreshTransactions();
    } catch (err: any) {
      alert(err.message || 'Failed to approve payment report');
    } finally {
      setApprovalLoadingId(null);
    }
  };

  const handleRejectPayment = async (txnId: string) => {
    const reason = window.prompt('Please enter the reason for rejecting this payment report:', 'Discrepancy with physical cash receipt');
    if (!reason) return;
    try {
      setApprovalLoadingId(txnId);
      await api.approveTransaction(currentUser, txnId, 'reject', reason);
      onRefreshTransactions();
    } catch (err: any) {
      alert(err.message || 'Failed to reject payment report');
    } finally {
      setApprovalLoadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid AED amount.');
      return;
    }

    const costNum = txnType === 'income' ? (Number(saleCost) || 0) : 0;
    if (costNum < 0) {
      alert('Cost / Expense for this sale cannot be negative.');
      return;
    }

    setLoading(true);

    try {
      await api.createTransaction(currentUser, {
        type: txnType,
        category,
        amount: Number(amount),
        cost: txnType === 'income' && costNum > 0 ? costNum : undefined,
        method,
        payerName: payerName.trim() || undefined,
        relatedClientId: relatedClientId || undefined,
        relatedAgentId: relatedAgentId || undefined,
        relatedJobId: relatedJobId || undefined,
        date,
        notes,
      });

      setIsModalOpen(false);
      onRefreshTransactions();
    } catch (err: any) {
      alert(err.message || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Amount (AED)', 'Method', 'Notes', 'Recorded By'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date,
      t.type.toUpperCase(),
      `"${t.category}"`,
      t.amount.toFixed(2),
      t.method,
      `"${t.notes || ''}"`,
      `"${t.createdByName || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `corelink-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-[#C9A05C]" />
            {isMaster ? 'Financial Management & General Ledger' : 'My Commission Ledger'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isMaster
              ? 'Manual transaction records, operational expenses, profit & loss, and sub-agent running balances'
              : 'Detailed breakdown of commission earned, payouts received, and running balance'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Download CSV for Excel Accounting"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A05C]" />
            <span>Export CSV</span>
          </button>

          {isMaster && (
            <>
              <button
                onClick={() => handleOpenAddModal('expense')}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Record Expense</span>
              </button>
              <button
                onClick={() => handleOpenAddModal('income')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Income</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dedicated Pending Sub-Agent Payment Reports Queue (Master Admin) */}
      {isMaster && pendingApprovalTxns.length > 0 && (
        <div className="bg-amber-950/40 border-2 border-amber-600/60 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-sm font-bold text-amber-200">
                Pending Sub-Agent Payment Reports ({pendingApprovalTxns.length} requires verification)
              </h2>
            </div>
            <span className="text-[11px] text-amber-400/80 font-medium">
              Sub-agents reported collected payments from clients awaiting official ledger confirmation
            </span>
          </div>

          <div className="overflow-x-auto bg-slate-950/80 border border-amber-900/50 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-amber-950/60 text-amber-300 uppercase text-[10px] tracking-wider border-b border-amber-900/40">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Sub-Agent</th>
                  <th className="py-2.5 px-4">Customer / Payer</th>
                  <th className="py-2.5 px-4">Job / Service</th>
                  <th className="py-2.5 px-4">Amount (AED)</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Notes</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pendingApprovalTxns.map(pt => (
                  <tr key={pt.id} className="hover:bg-amber-950/20">
                    <td className="py-3 px-4 font-mono text-slate-300">{formatDate(pt.date)}</td>
                    <td className="py-3 px-4 font-bold text-white">{pt.createdByName || pt.relatedAgentId || 'Sub-Agent'}</td>
                    <td className="py-3 px-4 text-amber-200 font-semibold">{pt.payerName || 'Walk-in Client'}</td>
                    <td className="py-3 px-4 font-mono text-[#C9A05C] text-[11px]">{pt.relatedJobId || pt.category}</td>
                    <td className="py-3 px-4 font-black text-emerald-400 text-sm">{formatAED(pt.amount)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">
                        {pt.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[180px] truncate">{pt.notes || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={approvalLoadingId === pt.id}
                          onClick={() => handleApprovePayment(pt.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow transition cursor-pointer"
                        >
                          {approvalLoadingId === pt.id ? 'Saving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={approvalLoadingId === pt.id}
                          onClick={() => handleRejectPayment(pt.id)}
                          className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded font-semibold text-xs transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-t border-x ${
            activeTab === 'daily'
              ? 'bg-slate-900 border-slate-800 text-amber-300 border-b-2 border-b-[#C9A05C]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#C9A05C]" />
          <span>Daily Cash Flow &amp; Sales Log</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
            {selectedDay === new Date().toISOString().split('T')[0] ? 'Today' : selectedDay}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-t border-x ${
            activeTab === 'ledger'
              ? 'bg-slate-900 border-slate-800 text-amber-300 border-b-2 border-b-[#C9A05C]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <WalletCards className="w-4 h-4 text-[#C9A05C]" />
          <span>All Transactions &amp; Running Ledgers</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {filteredTransactions.length}
          </span>
        </button>

        {isMaster && (
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-t border-x ${
              activeTab === 'suppliers'
                ? 'bg-slate-900 border-slate-800 text-amber-300 border-b-2 border-b-[#C9A05C]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-[#C9A05C]" />
            <span>Suppliers &amp; Vendor Payables</span>
          </button>
        )}
      </div>

      {/* ===================== TAB 1: DAILY CASH FLOW & SALES LOG ===================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Day Selector & Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#C9A05C]" />
                <span className="text-xs font-bold text-white">Select Date:</span>
              </div>
              <input
                type="date"
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedDay(new Date().toISOString().split('T')[0])}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    selectedDay === new Date().toISOString().split('T')[0]
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setSelectedDay(y.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Yesterday
                </button>
              </div>
            </div>

            {/* Quick Action Buttons for selected date */}
            {isMaster && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAddModal('expense', selectedDay)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-800/80 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>+ Add Expense</span>
                </button>
                <button
                  onClick={() => handleOpenAddModal('income', selectedDay)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/80 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+ Add Sale / Income</span>
                </button>
              </div>
            )}
          </div>

          {/* Daily 3-Card Summary for Selected Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>Daily Sales / Income</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">{formatAED(selectedDaySales)}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {selectedDayTransactions.filter(t => t.type === 'income').length} sale transaction(s)
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>Daily Expenses</span>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400">{formatAED(selectedDayExpenses)}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {selectedDayTransactions.filter(t => t.type === 'expense').length} expense entry/entries
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>Net Daily Profit</span>
                <DollarSign className="w-4 h-4 text-[#C9A05C]" />
              </div>
              <div className={`text-2xl font-black ${selectedDayProfit >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                {formatAED(selectedDayProfit)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Sales − Expenses on {formatDate(selectedDay)}
              </div>
            </div>
          </div>

          {/* Detailed Transaction List for Selected Date */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C9A05C]" />
                  Recorded Transactions for {formatDate(selectedDay)}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedDayTransactions.length} transaction(s) logged on this calendar day
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount &amp; Profit (AED)</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Client / Job / Agent</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedDayTransactions.map(txn => {
                    const isIncome = txn.type === 'income';
                    const saleCostVal = getSaleCost(txn);
                    return (
                      <tr key={txn.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{txn.category}</span>
                            {isIncome && saleCostVal > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                Profit Tracked
                              </span>
                            )}
                            {txn.type === 'expense' && txn.category === 'Cost of Sale' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                                Linked Cost
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-4 font-black ${
                            isIncome ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <div>{isIncome ? '+' : '-'} {formatAED(txn.amount)}</div>
                          {isIncome && saleCostVal > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 mt-1 whitespace-nowrap">
                              <span className="text-rose-300">Cost: {formatAED(saleCostVal)}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-emerald-300 font-bold bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 rounded text-[10px]">
                                Net Profit: {formatAED(txn.amount - saleCostVal)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-medium text-slate-300">
                            {txn.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {txn.payerName && (
                            <span className="font-semibold text-white block">{txn.payerName}</span>
                          )}
                          {txn.relatedClientId && !txn.payerName && (
                            <span className="text-slate-300 block">{clients.find(c => c.id === txn.relatedClientId)?.nameEn || 'Client'}</span>
                          )}
                          {txn.relatedJobId && (
                            <span className="font-mono text-[#C9A05C] text-[10px] block">{txn.relatedJobId}</span>
                          )}
                          {txn.relatedAgentId && (
                            <span className="text-[10px] text-slate-500 block">Agent: {subAgents.find(a => a.id === txn.relatedAgentId)?.name || txn.relatedAgentId}</span>
                          )}
                          {!txn.payerName && !txn.relatedClientId && !txn.relatedJobId && !txn.relatedAgentId && (
                            <span className="text-slate-600 italic">General Entry</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                          {txn.notes || <span className="text-slate-600 italic">None</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {txn.createdByName || 'System'}
                        </td>
                      </tr>
                    );
                  })}

                  {selectedDayTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        <p className="text-xs">No transactions recorded on {formatDate(selectedDay)}.</p>
                        {isMaster && (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenAddModal('income', selectedDay)}
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              + Record Sale for this Date
                            </button>
                            <button
                              onClick={() => handleOpenAddModal('expense', selectedDay)}
                              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              + Record Expense for this Date
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 30-Day Daily Audit & Performance Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C9A05C]" />
                  30-Day Daily Sales &amp; Expense Audit
                </h3>
                <p className="text-[11px] text-slate-400">
                  Rolling day-by-day financial performance breakdown. Click any day to inspect its full transaction logs.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-400">
                Total 30-Day Profit:{' '}
                <span className="font-bold text-amber-300">
                  {formatAED(last30Days.reduce((sum, d) => sum + d.profit, 0))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Sales / Income</th>
                    <th className="py-3 px-4">Expenses</th>
                    <th className="py-3 px-4">Net Profit</th>
                    <th className="py-3 px-4">Entries</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {last30Days.map(item => {
                    const isSelected = item.date === selectedDay;
                    const isToday = item.date === new Date().toISOString().split('T')[0];
                    return (
                      <tr
                        key={item.date}
                        onClick={() => setSelectedDay(item.date)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-500/10 border-l-4 border-l-[#C9A05C]'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                          <span>{item.dateFormatted}</span>
                          {isToday && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C9A05C]/20 text-amber-300 font-bold uppercase">
                              Today
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-400">
                          {item.sales > 0 ? `+${formatAED(item.sales)}` : '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-rose-400">
                          {item.expenses > 0 ? `-${formatAED(item.expenses)}` : '-'}
                        </td>
                        <td
                          className={`py-3 px-4 font-black ${
                            item.profit > 0
                              ? 'text-amber-300'
                              : item.profit < 0
                              ? 'text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.profit !== 0 ? formatAED(item.profit) : 'AED 0.00'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {item.count > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                              {item.count} log(s)
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedDay(item.date);
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/30 text-amber-200'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Viewing' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: GENERAL LEDGER & ALL TRANSACTIONS ===================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isMaster ? (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                    <span>Total Income (Revenue)</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{formatAED(totalIncome)}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">Manual payments &amp; invoice receipts</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                    <span>Total Operating Expenses</span>
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{formatAED(totalExpense)}</div>
                  <div className="text-[11px] text-rose-400 mt-1">Rent, gov vouchers, commissions</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                    <span>Net Profit / Loss</span>
                    <DollarSign className="w-4 h-4 text-[#C9A05C]" />
                  </div>
                  <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                    {formatAED(netProfit)}
                  </div>
                  <div className="text-[11px] text-[#C9A05C] mt-1">Calculated: Income − Expenses</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Total Commission Earned</div>
                  <div className="text-2xl font-black text-amber-300">{formatAED(totalAgentCommissionEarned)}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Earned from all completed jobs</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Total Paid to You</div>
                  <div className="text-2xl font-black text-emerald-400">{formatAED(totalAgentPayoutsReceived)}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Payout vouchers issued</div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 rounded-xl p-5 shadow-md">
                  <div className="text-xs text-amber-200 font-bold mb-1">Outstanding Balance</div>
                  <div className="text-2xl font-black text-white">{formatAED(outstandingCommission)}</div>
                  <div className="text-[11px] text-amber-300 mt-1">Earned − Paid Out</div>
                </div>
              </>
            )}
          </div>

          {/* Sub-Agent Running Ledger Selector (Master Admin only) */}
          {isMaster && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#C9A05C]" />
                    Sub-Agent Commission Running Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Track how much commission is owed vs. paid out to each individual sub-agent
                  </p>
                </div>

                <select
                  value={selectedAgentLedger}
                  onChange={e => setSelectedAgentLedger(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  <option value="all">Company-Wide (All Agents)</option>
                  {subAgents.map(ag => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} {ag.companyName ? `(${ag.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAgentLedger !== 'all' && activeAgent && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Selected Agent:</span>
                    <span className="font-bold text-white text-sm">{activeAgent.name}</span>
                    <div className="text-[10px] text-slate-500">{activeAgent.companyName || 'Sole Agent'}</div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Total Commission Earned:</span>
                    <span className="font-bold text-amber-300 text-sm">{formatAED(totalAgentCommissionEarned)}</span>
                    <div className="text-[10px] text-slate-500">From {agentJobs.length} assigned jobs</div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Total Payouts Paid:</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatAED(totalAgentPayoutsReceived)}</span>
                    <div className="text-[10px] text-slate-500">Recorded commission expenses</div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Current Outstanding Balance:</span>
                    <span className="font-black text-amber-400 text-sm">{formatAED(outstandingCommission)}</span>
                    <div className="text-[10px] text-slate-400">
                      {outstandingCommission > 0 ? 'Payable to Agent' : 'Fully Settled'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by category, notes, or method..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C]"
              >
                <option value="all">All Types (Income &amp; Expense)</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount &amp; Profit (AED)</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Related Job / Sub-Agent</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTransactions.map(txn => {
                    const isIncome = txn.type === 'income';
                    const saleCostVal = getSaleCost(txn);
                    return (
                      <tr key={txn.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-400">{formatDate(txn.date)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{txn.category}</span>
                            {isIncome && saleCostVal > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                Profit Tracked
                              </span>
                            )}
                            {txn.type === 'expense' && txn.category === 'Cost of Sale' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                                Linked Cost
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-4 font-black ${
                            isIncome ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <div>{isIncome ? '+' : '-'} {formatAED(txn.amount)}</div>
                          {isIncome && saleCostVal > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 mt-1 whitespace-nowrap">
                              <span className="text-rose-300">Cost: {formatAED(saleCostVal)}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-emerald-300 font-bold bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 rounded text-[10px]">
                                Net Profit: {formatAED(txn.amount - saleCostVal)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-medium text-slate-300">
                            {txn.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {txn.payerName && (
                            <div className="font-semibold text-white">{txn.payerName}</div>
                          )}
                          {txn.relatedClientId && !txn.payerName && (
                            <div className="text-slate-300">{clients.find(c => c.id === txn.relatedClientId)?.nameEn || 'Client'}</div>
                          )}
                          {txn.relatedJobId && (
                            <div className="font-mono text-[#C9A05C] text-[10px]">{txn.relatedJobId}</div>
                          )}
                          {txn.relatedAgentId && (
                            <div className="text-[10px] text-slate-500">Agent: {subAgents.find(a => a.id === txn.relatedAgentId)?.name || txn.relatedAgentId}</div>
                          )}
                          {!txn.payerName && !txn.relatedClientId && !txn.relatedJobId && !txn.relatedAgentId && (
                            <span className="text-slate-600 italic">General Office</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                          {txn.notes || <span className="text-slate-600 italic">None</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No financial transactions recorded for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: SUPPLIERS & VENDOR PAYABLES ===================== */}
      {activeTab === 'suppliers' && (
        <SupplierManagement
          currentUser={currentUser}
          onRefreshTransactions={onRefreshTransactions}
        />
      )}

      {/* Manual Entry Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#C9A05C]" />
                Record Financial Entry (Manual Ledger)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setTxnType('income');
                    setCategory(incomeCategories[0]);
                  }}
                  className={`py-2 rounded-md transition cursor-pointer ${
                    txnType === 'income'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Income (Revenue)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxnType('expense');
                    setCategory(EXPENSE_CATEGORIES[0]);
                  }}
                  className={`py-2 rounded-md transition cursor-pointer ${
                    txnType === 'expense'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Expense (Outflow)
                </button>
              </div>

              {/* Amount and Method */}
              {txnType === 'income' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Sale / Income Amount in AED *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-hidden focus:border-[#C9A05C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Cost / Expense for this Sale (AED)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={saleCost}
                        onChange={e => setSaleCost(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-hidden focus:border-[#C9A05C]"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Optional (defaults to 0). Auto-generates linked "Cost of Sale" expense.
                      </p>
                    </div>
                  </div>

                  {Number(amount) > 0 && (
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-semibold">Net Profit for this Sale</span>
                        <span className="text-[10px] text-slate-500">
                          Full Amount ({formatAED(Number(amount) || 0)}) − Delivery Cost ({formatAED(Number(saleCost) || 0)})
                        </span>
                      </div>
                      <span className="font-black text-sm text-emerald-400">
                        {formatAED(Math.max(0, (Number(amount) || 0) - (Number(saleCost) || 0)))}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={method}
                      onChange={e => setMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      <option value="Cash">Cash (Manual Handover)</option>
                      <option value="Bank Transfer">Bank Transfer (WPS / IBAN)</option>
                      <option value="Cheque">Cheque Deposit</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Amount in AED *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={method}
                      onChange={e => setMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      <option value="Cash">Cash (Manual Handover)</option>
                      <option value="Bank Transfer">Bank Transfer (WPS / IBAN)</option>
                      <option value="Cheque">Cheque Deposit</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Accounting Category *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  {currentCategoryList.map((cat, i) => (
                    <option key={i} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer / Payer Name for Walk-ins or Direct */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer / Payer Name (Walk-in or Direct)
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  placeholder="e.g. Walk-in Customer or Company Name (no pre-saved client required)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              {/* Related Sub-Agent / Job Linking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Related Sub-Agent (Optional)
                  </label>
                  <select
                    value={relatedAgentId}
                    onChange={e => setRelatedAgentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="">None</option>
                    {subAgents.map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.companyName || 'Sub-Agent'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Related Client (Optional)
                  </label>
                  <select
                    value={relatedClientId}
                    onChange={e => setRelatedClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="">None</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks &amp; Reference Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Receipt number, bank reference, or voucher details..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {loading ? 'Recording...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
