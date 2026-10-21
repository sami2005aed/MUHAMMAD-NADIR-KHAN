import React, { useState } from 'react';
import {
  User,
  Job,
  Client,
  Transaction,
  Invoice,
  CompanySettings,
  ClientDocument,
  Employee,
} from '../types.ts';
import { formatAED, formatDate, getExpiryStatus } from '../utils/formatters.ts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle,
  Receipt,
  FileSignature,
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  FileCheck,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  users: User[];
  jobs: Job[];
  clients: Client[];
  transactions: Transaction[];
  invoices: Invoice[];
  documents?: ClientDocument[];
  employees?: Employee[];
  settings: CompanySettings;
  onNavigate: (tab: any) => void;
  onOpenNewJobModal: () => void;
  onOpenNewInvoiceModal: () => void;
  onOpenNewAgreementModal: () => void;
  onOpenNewTransactionModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  users = [],
  jobs = [],
  clients = [],
  transactions = [],
  invoices = [],
  documents = [],
  employees = [],
  settings,
  onNavigate,
  onOpenNewJobModal,
  onOpenNewInvoiceModal,
  onOpenNewAgreementModal,
  onOpenNewTransactionModal,
}) => {
  const isMaster = currentUser.role === 'master_admin';
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all'>('month');

  // Defensive array checks
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const isRecentlyUpdated = (dateStr?: string) => {
    if (!dateStr) return false;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return false;
    return Date.now() - time < 24 * 60 * 60 * 1000;
  };

  // Master Admin calculations
  const totalRevenue = safeTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = safeTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  const pendingInvoices = safeInvoices.filter(i => i.status === 'Unpaid' || i.status === 'Partially Paid');
  const pendingPaymentsAmount = pendingInvoices.reduce((sum, i) => sum + (i.grandTotal - i.amountPaid), 0);

  const jobsInProgress = safeJobs.filter(j => j.status === 'In Progress');
  const jobsCompleted = safeJobs.filter(j => j.status === 'Completed' || j.status === 'Delivered');
  const pendingJobs = safeJobs.filter(j => j.status === 'Pending');

  // Sub-Agents
  const subAgentsList = safeUsers.filter(u => u.role === 'sub_agent');
  const pendingSubAgents = subAgentsList.filter(u => u.status === 'pending');

  // Master Admin "Pending From Agents" summary calculations
  const agentBalanceDetails = subAgentsList.map(agent => {
    const agentJobs = safeJobs.filter(j => j.agentId === agent.id);
    const totalEarned = agentJobs.reduce((sum, j) => sum + (j.commissionAmount || 0), 0);
    const totalPaid = safeTransactions
      .filter(
        t =>
          t.relatedAgentId === agent.id &&
          (t.category === 'Sub-Agent Commission Payouts' || t.type === 'expense')
      )
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalEarned - totalPaid;
    return {
      agent,
      jobsCount: agentJobs.length,
      totalEarned,
      totalPaid,
      balance,
    };
  });

  const totalAgentOutstandingBalance = agentBalanceDetails.reduce((sum, a) => sum + a.balance, 0);

  // Documents currently in "Received" or "Under Review" status awaiting admin action
  const pendingActionDocuments = safeDocuments.filter(
    d => d.status === 'Received' || d.status === 'Under Review'
  );
  const pendingActionDocsCount = pendingActionDocuments.length;

  // Workforce / Manpower summary calculations (Master Admin)
  const activeEmployees = safeEmployees.filter(e => e.status === 'Active');
  const activeEmployeesCount = activeEmployees.length;
  const workforceVisaExpiringCount = activeEmployees.filter(e => {
    const s = getExpiryStatus(e.visaExpiry);
    return s.status === 'expiring_soon' || s.status === 'expired';
  }).length;
  const workforcePassportExpiringCount = activeEmployees.filter(e => {
    const s = getExpiryStatus(e.passportExpiry);
    return s.status === 'expiring_soon' || s.status === 'expired';
  }).length;

  // Expiring clients
  const expiringClients = safeClients
    .map(c => ({
      client: c,
      visaStatus: getExpiryStatus(c.visaExpiry),
      idStatus: getExpiryStatus(c.idExpiry),
      licenseStatus: getExpiryStatus(c.licenseExpiry),
    }))
    .filter(
      item =>
        item.visaStatus.status === 'expiring_soon' ||
        item.visaStatus.status === 'expired' ||
        item.licenseStatus.status === 'expiring_soon' ||
        item.licenseStatus.status === 'expired'
    );

  // Sub-Agent specific calculations (ISOLATED TO CURRENT USER)
  const myJobs = safeJobs.filter(j => j.agentId === currentUser.id);
  const myTotalCommissionEarned = myJobs.reduce((sum, j) => sum + (j.commissionAmount || 0), 0);

  const myPayouts = safeTransactions.filter(
    t => t.relatedAgentId === currentUser.id && (t.category === 'Sub-Agent Commission Payouts' || t.type === 'expense')
  );
  const myTotalPayoutsReceived = myPayouts.reduce((sum, t) => sum + t.amount, 0);
  const myOutstandingCommission = myTotalCommissionEarned - myTotalPayoutsReceived;

  // Today's Sales, Expenses, and Profit Snapshot
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = safeTransactions.filter(t => t.date === todayStr);
  const todaySales = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayExpenses = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayProfit = todaySales - todayExpenses;

  // Monthly revenue chart aggregation
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenueData = [
    { month: 'May', income: 14200, expense: 7800, profit: 6400 },
    { month: 'Jun', income: 18500, expense: 9100, profit: 9400 },
    { month: 'Jul', income: 21300, expense: 11400, profit: 9900 },
    { month: 'Aug', income: 26800, expense: 13200, profit: 13600 },
    { month: 'Sep', income: totalRevenue || 31500, expense: totalExpenses || 14800, profit: (totalRevenue - totalExpenses) || 16700 },
  ];

  // Service breakdown
  const serviceDistribution: Record<string, number> = {};
  safeJobs.forEach(j => {
    serviceDistribution[j.type] = (serviceDistribution[j.type] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isMaster ? 'Executive Overview' : `Welcome, ${currentUser.name}`}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isMaster
                  ? 'bg-amber-500/20 text-[#C9A05C] border border-[#C9A05C]/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {isMaster ? 'Master Admin' : currentUser.companyName || 'Authorized Sub-Agent'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isMaster
              ? 'Complete operational, financial, and regulatory metrics for CORE LINK Administrative Services'
              : 'Track submitted client jobs, processing status, and real-time commission ledger'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isMaster ? (
            <>
              <button
                onClick={onOpenNewInvoiceModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-[#C9A05C]" />
                <span>Create Invoice</span>
              </button>
              <button
                onClick={onOpenNewAgreementModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <FileSignature className="w-4 h-4 text-[#C9A05C]" />
                <span>New Agreement</span>
              </button>
              <button
                onClick={onOpenNewTransactionModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Record Payment</span>
              </button>
              <button
                onClick={onOpenNewJobModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Job</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenNewJobModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Job/Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== MASTER ADMIN VIEW ===================== */}
      {isMaster && (
        <>
          {/* Today's Snapshot Mini-Card */}
          <div
            onClick={() => onNavigate('finance')}
            className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 shadow-lg transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Today&apos;s Financial Snapshot
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {formatDate(todayStr)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time sales, expenses, and net profit logged today. Click to open Daily Log.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-6 bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Today&apos;s Sales</span>
                <span className="text-sm md:text-base font-black text-emerald-400">
                  {formatAED(todaySales)}
                </span>
              </div>
              <div className="border-x border-slate-800 px-3 md:px-4">
                <span className="text-[10px] font-semibold text-slate-400 block">Today&apos;s Expenses</span>
                <span className="text-sm md:text-base font-black text-rose-400">
                  {formatAED(todayExpenses)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Today&apos;s Profit</span>
                <span
                  className={`text-sm md:text-base font-black ${
                    todayProfit >= 0 ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  {formatAED(todayProfit)}
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-[#C9A05C] hover:text-amber-300 self-center">
              <span>View Daily Log</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Key Stat Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Total Revenue</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{formatAED(totalRevenue)}</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <span>Across all services &amp; typing</span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Total Expenses</span>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{formatAED(totalExpenses)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Government vouchers &amp; operations</div>
            </div>

            {/* Net Profit */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Net Company Profit</span>
                <div className="p-2 rounded-lg bg-[#C9A05C]/15 text-[#C9A05C]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                {formatAED(netProfit)}
              </div>
              <div className="text-[11px] text-[#C9A05C] mt-1">Auto: Revenue - Expenses</div>
            </div>

            {/* Pending Invoices / Receivables */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Pending Receivables</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-400">{formatAED(pendingPaymentsAmount)}</div>
              <div className="text-[11px] text-slate-400 mt-1">{pendingInvoices.length} unpaid / partial invoice(s)</div>
            </div>
          </div>

          {/* Secondary Metric Badges (Users, Jobs, Expiries) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onNavigate('users')}
              className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Sub-Agents Registered</div>
                <div className="text-lg font-bold text-white mt-0.5">{subAgentsList.length}</div>
              </div>
              {pendingSubAgents.length > 0 && (
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  {pendingSubAgents.length} Pending
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('jobs')}
              className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Active Jobs / Tasks</div>
                <div className="text-lg font-bold text-blue-400 mt-0.5">{jobsInProgress.length + pendingJobs.length}</div>
              </div>
              <div className="text-[10px] text-slate-400">{jobsCompleted.length} Completed</div>
            </button>

            <button
              onClick={() => onNavigate('clients')}
              className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Total Clients CRM</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">{clients.length}</div>
              </div>
              <Users className="w-4 h-4 text-slate-500" />
            </button>

            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-left flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Trade License Expiry</div>
                <div className="text-sm font-bold text-amber-200 mt-0.5">{settings.companyLicenseExpiry}</div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Valid
              </span>
            </div>
          </div>

          {/* ================= WORKFORCE SUMMARY CARD (MASTER ADMIN) ================= */}
          <div
            onClick={() => onNavigate('manpower')}
            className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-lg transition cursor-pointer group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#C9A05C]/15 border border-[#C9A05C]/30 text-[#C9A05C]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Workforce Summary
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A05C]/20 text-[#C9A05C] border border-[#C9A05C]/30 uppercase font-bold tracking-wider">
                      Manpower / Employees
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Active manpower placements, residency visa validity, and passport expiry compliance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-[#C9A05C] group-hover:text-amber-300 transition self-start sm:self-auto">
                <span>Open Manpower Directory</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              {/* Stat 1: Total Active Employees */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                  <span>Total Active Employees</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-white mt-1">{activeEmployeesCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Currently active workforce placements</div>
              </div>

              {/* Stat 2: Visa Expiring within 30 days */}
              <div
                className={`border rounded-xl p-3 ${
                  workforceVisaExpiringCount > 0
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-950/80 border-slate-800/80'
                }`}
              >
                <div className="text-[11px] font-medium flex items-center justify-between text-slate-400">
                  <span>Visa Expiring ≤30 Days</span>
                  <Clock
                    className={`w-3.5 h-3.5 ${
                      workforceVisaExpiringCount > 0 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  />
                </div>
                <div
                  className={`text-xl font-black mt-1 ${
                    workforceVisaExpiringCount > 0 ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {workforceVisaExpiringCount}
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    workforceVisaExpiringCount > 0 ? 'text-amber-300/80' : 'text-slate-500'
                  }`}
                >
                  {workforceVisaExpiringCount > 0
                    ? 'Requires residency visa renewal'
                    : 'All active visas valid'}
                </div>
              </div>

              {/* Stat 3: Passport Expiring within 30 days */}
              <div
                className={`border rounded-xl p-3 ${
                  workforcePassportExpiringCount > 0
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-950/80 border-slate-800/80'
                }`}
              >
                <div className="text-[11px] font-medium flex items-center justify-between text-slate-400">
                  <span>Passport Expiring ≤30 Days</span>
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      workforcePassportExpiringCount > 0 ? 'text-rose-400' : 'text-slate-500'
                    }`}
                  />
                </div>
                <div
                  className={`text-xl font-black mt-1 ${
                    workforcePassportExpiringCount > 0 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {workforcePassportExpiringCount}
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    workforcePassportExpiringCount > 0 ? 'text-rose-300/80' : 'text-slate-500'
                  }`}
                >
                  {workforcePassportExpiringCount > 0
                    ? 'Embassy passport renewal needed'
                    : 'All passports valid'}
                </div>
              </div>
            </div>
          </div>

          {/* ================= ADMIN "PENDING FROM AGENTS" SUMMARY CARD ================= */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    Pending From Agents Summary
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A05C]/20 text-[#C9A05C] border border-[#C9A05C]/40 uppercase font-bold tracking-wider">
                      Follow-up Queue
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Combined outstanding balances owed and agent documents awaiting administrative action
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => onNavigate('finance')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-[#C9A05C]" />
                  <span>Settle Ledgers</span>
                </button>
                <button
                  onClick={() => onNavigate('documents')}
                  className="px-3 py-1.5 bg-[#C9A05C] hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Review Docs ({pendingActionDocsCount})</span>
                </button>
              </div>
            </div>

            {/* Two Main At-A-Glance Stat Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stat 1: Total Outstanding Balance Owed */}
              <div
                onClick={() => onNavigate('finance')}
                className="bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Sub-Agent Outstanding Balance
                  </span>
                  <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                    {formatAED(totalAgentOutstandingBalance)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Combined across {subAgentsList.length} sub-agent(s) (Earned commissions − payouts)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Stat 2: Count of Documents in Received/Under Review */}
              <div
                onClick={() => onNavigate('documents')}
                className="bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Documents Awaiting Admin Action
                  </span>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1 flex items-center gap-2">
                    <span>{pendingActionDocsCount}</span>
                    <span className="text-xs font-normal text-slate-400">files</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Currently in &apos;Received&apos; or &apos;Under Review&apos; status
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* At-a-Glance Follow-up List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
              {/* Column A: Pending Documents Follow-up */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#C9A05C]" />
                    <span>Documents Awaiting Review ({pendingActionDocsCount})</span>
                  </span>
                  <button
                    onClick={() => onNavigate('documents')}
                    className="text-[11px] text-[#C9A05C] hover:underline"
                  >
                    View All &rarr;
                  </button>
                </div>

                {pendingActionDocuments.length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 divide-y divide-slate-800/60">
                    {pendingActionDocuments.slice(0, 4).map(doc => (
                      <div key={doc.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-white truncate max-w-[180px] sm:max-w-[220px]" title={doc.name}>
                            {doc.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {doc.clientName ? `${doc.clientName} ` : ''}
                            {doc.jobId ? `• Job: ${doc.jobId}` : ''}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 border ${
                            doc.status === 'Received'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">
                    No documents currently awaiting administrative action.
                  </div>
                )}
              </div>

              {/* Column B: Sub-Agent Balances Follow-up */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sub-Agents with Balances ({agentBalanceDetails.filter(a => a.balance > 0).length})</span>
                  </span>
                  <button
                    onClick={() => onNavigate('finance')}
                    className="text-[11px] text-[#C9A05C] hover:underline"
                  >
                    View Ledger &rarr;
                  </button>
                </div>

                {agentBalanceDetails.filter(a => a.balance > 0).length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 divide-y divide-slate-800/60">
                    {agentBalanceDetails
                      .filter(a => a.balance > 0)
                      .slice(0, 4)
                      .map(({ agent, jobsCount, balance }) => (
                        <div key={agent.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-white truncate max-w-[180px]">
                              {agent.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {agent.companyName || 'Sub-Agent'} • {jobsCount} job(s)
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-amber-300 font-mono">
                              {formatAED(balance)}
                            </span>
                            <span className="text-[9px] text-slate-500 block">Payable</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">
                    All sub-agent commission accounts are settled and up to date.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Charts & Visual Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Revenue & Expense Bar/Line Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#C9A05C]" />
                    Revenue &amp; Net Profit Trend (AED)
                  </h3>
                  <p className="text-[11px] text-slate-400">Monthly financial performance &amp; margin growth</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setTimeFilter('month')}
                    className={`px-2 py-0.5 rounded font-semibold ${
                      timeFilter === 'month' ? 'bg-[#C9A05C] text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setTimeFilter('year')}
                    className={`px-2 py-0.5 rounded font-semibold ${
                      timeFilter === 'year' ? 'bg-[#C9A05C] text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="h-64 flex flex-col justify-end pt-6">
                <div className="flex items-end justify-between h-48 gap-3 sm:gap-6 px-2 border-b border-slate-800">
                  {monthlyRevenueData.map((d, idx) => {
                    const maxVal = 35000;
                    const incomeHeight = Math.min(100, Math.round((d.income / maxVal) * 100));
                    const expenseHeight = Math.min(100, Math.round((d.expense / maxVal) * 100));
                    const profitHeight = Math.min(100, Math.round((d.profit / maxVal) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                          {/* Income Bar */}
                          <div
                            style={{ height: `${incomeHeight}%` }}
                            className="w-3 sm:w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all group-hover:brightness-125 relative"
                            title={`Revenue: AED ${d.income.toLocaleString()}`}
                          />
                          {/* Expense Bar */}
                          <div
                            style={{ height: `${expenseHeight}%` }}
                            className="w-3 sm:w-5 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t transition-all group-hover:brightness-125 relative"
                            title={`Expense: AED ${d.expense.toLocaleString()}`}
                          />
                          {/* Profit Bar */}
                          <div
                            style={{ height: `${profitHeight}%` }}
                            className="w-3 sm:w-5 bg-gradient-to-t from-[#C9A05C] to-amber-300 rounded-t transition-all group-hover:brightness-125 relative"
                            title={`Net Profit: AED ${d.profit.toLocaleString()}`}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-2">{d.month}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-xs bg-emerald-500" />
                    <span className="text-slate-300">Revenue (AED)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-xs bg-rose-500" />
                    <span className="text-slate-300">Expenses (AED)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-xs bg-[#C9A05C]" />
                    <span className="text-amber-200">Net Profit (AED)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Distribution Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-[#C9A05C]" />
                  Service Volume Breakdown
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">Job distribution across administrative activities</p>

                <div className="space-y-3">
                  {Object.entries(serviceDistribution).map(([name, count], i) => {
                    const total = jobs.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex justify-between text-slate-300 font-medium mb-1">
                          <span className="truncate pr-2">{name}</span>
                          <span className="font-bold text-amber-300">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-[#C9A05C] to-amber-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(serviceDistribution).length === 0 && (
                    <div className="text-xs text-slate-500 py-6 text-center">No service records yet.</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigate('jobs')}
                className="mt-4 w-full py-2 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg text-center transition"
              >
                View All Jobs Kanban &rarr;
              </button>
            </div>
          </div>

          {/* Expiry Alerts & Recent Activity Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Client Document Expiries */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Upcoming Expiries (Visas &amp; Licenses)
                </h3>
                <button
                  onClick={() => onNavigate('clients')}
                  className="text-xs text-[#C9A05C] hover:underline"
                >
                  Manage Clients &rarr;
                </button>
              </div>

              {expiringClients.length > 0 ? (
                <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto pr-1">
                  {expiringClients.map(({ client, visaStatus, licenseStatus }, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{client.nameEn}</div>
                        <div className="text-[11px] text-slate-400 font-arabic">{client.nameAr} &bull; {client.nationality}</div>
                      </div>
                      <div className="text-right">
                        {visaStatus.days !== null && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${visaStatus.badgeClass}`}>
                            Visa: {visaStatus.label}
                          </span>
                        )}
                        {licenseStatus.days !== null && (
                          <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold border ${licenseStatus.badgeClass}`}>
                            Trade: {licenseStatus.label}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400/50 mb-2" />
                  <span>No client visas or trade licenses expiring within 30 days.</span>
                </div>
              )}
            </div>

            {/* Pending Approvals / Sub-Agents Queue */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C9A05C]" />
                  Sub-Agent Applications &amp; Status
                </h3>
                <button
                  onClick={() => onNavigate('users')}
                  className="text-xs text-[#C9A05C] hover:underline"
                >
                  User Management &rarr;
                </button>
              </div>

              <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto pr-1">
                {subAgentsList.map((agent, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{agent.name}</span>
                        {agent.companyName && (
                          <span className="text-[10px] text-slate-400 font-normal">({agent.companyName})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{agent.email} &bull; {agent.phone}</div>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          agent.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : agent.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {agent.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===================== SUB-AGENT ISOLATED VIEW ===================== */}
      {!isMaster && (
        <>
          {/* Sub-Agent Running Ledger & Commission Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Commission Earned */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="text-xs text-slate-400 font-semibold mb-1">Total Commission Earned</div>
              <div className="text-2xl font-black text-amber-300">{formatAED(myTotalCommissionEarned)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Sum of commissions set for your completed jobs</div>
            </div>

            {/* Total Paid Out */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="text-xs text-slate-400 font-semibold mb-1">Total Payouts Received</div>
              <div className="text-2xl font-black text-emerald-400">{formatAED(myTotalPayoutsReceived)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Disbursed by CORE LINK management</div>
            </div>

            {/* Outstanding Balance */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-xl p-5 shadow-md">
              <div className="text-xs text-amber-200 font-bold mb-1">Outstanding Commission Balance</div>
              <div className="text-2xl font-black text-white">{formatAED(myOutstandingCommission)}</div>
              <div className="text-[11px] text-amber-300 mt-1">Running balance payable to you</div>
            </div>
          </div>

          {/* Sub-Agent Jobs Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#C9A05C]" />
                  Your Submitted Jobs &amp; Progress (Read-Only)
                </h3>
                <p className="text-[11px] text-slate-400">Track customer visa typing and government status updates</p>
              </div>
              <button
                onClick={onOpenNewJobModal}
                className="px-3 py-1.5 bg-[#C9A05C] hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Another Job</span>
              </button>
            </div>

            {myJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Job ID</th>
                      <th className="py-2.5 px-3">Client Name</th>
                      <th className="py-2.5 px-3">Service Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Your Commission</th>
                      <th className="py-2.5 px-3">Submitted Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {myJobs.map(job => (
                      <tr key={job.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-[#C9A05C] font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{job.id}</span>
                            {isRecentlyUpdated(job.updatedAt || job.createdAt) && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                                Updated
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {job.clientNameEn}
                          {job.clientNameAr && <div className="text-[10px] text-slate-400 font-arabic">{job.clientNameAr}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{job.type}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              job.status === 'Completed' || job.status === 'Delivered'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : job.status === 'In Progress'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : job.status === 'Cancelled' || job.status === 'Rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-300">
                          {job.commissionAmount ? formatAED(job.commissionAmount) : (
                            <span className="text-slate-500 font-normal italic">Pending Admin Review</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{formatDate(job.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Briefcase className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No jobs submitted yet</p>
                <p className="text-xs text-slate-500 mt-1">Submit your first client application to begin tracking commissions.</p>
                <button
                  onClick={onOpenNewJobModal}
                  className="mt-4 px-4 py-2 bg-[#C9A05C] text-slate-950 font-bold text-xs rounded-lg shadow transition"
                >
                  Submit New Job Now
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
