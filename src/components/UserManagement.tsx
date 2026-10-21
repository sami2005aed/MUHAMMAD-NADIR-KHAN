import React, { useState, useEffect } from 'react';
import { User, UserStatus, Job, Transaction, ClientDocument } from '../types.ts';
import { api } from '../services/api.ts';
import { formatDate, formatAED } from '../utils/formatters.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { isMasterAdmin, logRoleDetection } from '../utils/auth.ts';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Trash2,
  Edit2,
  Search,
  Filter,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  FileText,
  MapPin,
  CheckCircle,
  Eye,
  Briefcase,
  WalletCards,
  X,
  Loader2,
} from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  jobs?: Job[];
  transactions?: Transaction[];
  documents?: ClientDocument[];
  onRefreshUsers: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  users,
  jobs = [],
  transactions = [],
  documents = [],
  onRefreshUsers,
}) => {
  const isMaster = isMasterAdmin(currentUser);
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];

  useEffect(() => {
    logRoleDetection('UserManagement', currentUser);
  }, [currentUser]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileModalAgent, setProfileModalAgent] = useState<User | null>(null);

  // Edit Sub-Agent Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditCompanyName(user.companyName || '');
    setEditPhone(user.phone || '');
    setEditStatus(user.status);
    setEditError('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditSaving(true);
    setEditError('');
    try {
      await api.updateUser(currentUser, editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        companyName: editCompanyName.trim(),
        phone: editPhone.trim(),
        status: editStatus,
      });
      setFeedbackMsg({ type: 'success', text: `Sub-agent ${editName} updated successfully.` });
      setEditingUser(null);
      onRefreshUsers();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update sub-agent');
    } finally {
      setIsEditSaving(false);
    }
  };

  // Sub-agents list
  const subAgents = users.filter(u => u.role === 'sub_agent');

  // Filtered sub-agents
  const filtered = subAgents.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.companyName && u.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (u.phone && u.phone.includes(search));

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: users.length,
    subAgentsTotal: subAgents.length,
    active: subAgents.filter(u => u.status === 'active').length,
    pending: subAgents.filter(u => u.status === 'pending').length,
    blocked: subAgents.filter(u => u.status === 'blocked').length,
  };

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    setLoadingId(userId);
    setFeedbackMsg(null);
    try {
      const res = await api.updateUserStatus(currentUser, userId, newStatus);
      setFeedbackMsg({ type: 'success', text: res.message });
      onRefreshUsers();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update user status.' });
    } finally {
      setLoadingId(null);
    }
  };

  // Deletion confirmation modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: '',
    userName: '',
  });

  const handleDeleteUser = (userId: string, name: string) => {
    setDeleteModalState({
      isOpen: true,
      userId,
      userName: name,
    });
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteModalState.userId) return;
    setLoadingId(deleteModalState.userId);
    setFeedbackMsg(null);
    try {
      await api.deleteUser(currentUser, deleteModalState.userId);
      setFeedbackMsg({ type: 'success', text: `Sub-agent ${deleteModalState.userName} has been deleted.` });
      onRefreshUsers();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete user.' });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Prominent User Counts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[#C9A05C]" />
              Sub-Agent Directory &amp; Access Control
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Approve new registrations, manage permissions, suspend/block access, and track agent activity.
            </p>
          </div>

          {/* Prominent Total Users Display */}
          <div className="flex items-center gap-3 bg-slate-950 px-5 py-3 rounded-xl border border-slate-800 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Total System Accounts
              </span>
              <span className="text-2xl font-black text-amber-300">{counts.total}</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Sub-Agents
              </span>
              <span className="text-2xl font-black text-white">{counts.subAgentsTotal}</span>
            </div>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setStatusFilter('active')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-500/20 border-emerald-500 text-white'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 font-medium">Active Agents</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{counts.active}</div>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 border-amber-500 text-white'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>Pending Review</span>
              {counts.pending > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{counts.pending}</div>
          </button>

          <button
            onClick={() => setStatusFilter('blocked')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'blocked'
                ? 'bg-rose-500/20 border-rose-500 text-white'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] text-slate-400 font-medium">Blocked / Suspended</div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">{counts.blocked}</div>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by agent name, company, email..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C]"
          >
            <option value="all">All Statuses ({subAgents.length})</option>
            <option value="active">Active Only ({counts.active})</option>
            <option value="pending">Pending Approval Only ({counts.pending})</option>
            <option value="blocked">Blocked Only ({counts.blocked})</option>
          </select>
        </div>
      </div>

      {/* Sub-Agents Cards / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {filtered.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {filtered.map(agent => {
              const isLoading = loadingId === agent.id;
              return (
                <div
                  key={agent.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
                >
                  {/* Agent Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-base text-white">{agent.name}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          agent.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : agent.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-400">
                      {agent.companyName && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#C9A05C]" />
                          <span>{agent.companyName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{agent.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{agent.phone}</span>
                      </div>
                      {agent.emiratesIdOrPassport && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>ID/Passport: {agent.emiratesIdOrPassport}</span>
                        </div>
                      )}
                      {agent.address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{agent.address}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500">
                        Registered: {formatDate(agent.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Master Admin Control Buttons */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {/* View Full Profile Button */}
                    <button
                      onClick={() => setProfileModalAgent(agent)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                      title="View complete agent profile, job history, ledger and documents"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Full Profile</span>
                    </button>

                    {/* Approve Button (when pending or blocked) */}
                    {agent.status !== 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(agent.id, 'active')}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer disabled:opacity-50"
                        title="Approve and activate agent account"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Block / Suspend Button */}
                    {agent.status === 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(agent.id, 'blocked')}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                        title="Suspend/Block this agent from logging in"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Block</span>
                      </button>
                    )}

                    {/* Unblock Button */}
                    {agent.status === 'blocked' && (
                      <button
                        onClick={() => handleUpdateStatus(agent.id, 'active')}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                        title="Restore agent access"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Unblock</span>
                      </button>
                    )}

                    {/* Edit Sub-Agent Button */}
                    <button
                      onClick={() => handleOpenEditModal(agent)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
                      title="Edit Sub-Agent Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteUser(agent.id, agent.name)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Permanently Delete Sub-Agent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No sub-agents match this filter</p>
            <p className="text-xs text-slate-500 mt-1">New sub-agents will appear here when they self-register.</p>
          </div>
        )}
      </div>

      {/* ===================== FULL SUB-AGENT PROFILE MODAL ===================== */}
      {profileModalAgent && (() => {
        const agentJobs = safeJobs.filter(j => j.agentId === profileModalAgent.id);
        const agentTxns = safeTransactions.filter(t => t.relatedAgentId === profileModalAgent.id);
        const agentDocs = safeDocuments.filter(
          d => d.uploadedBy === profileModalAgent.id || agentJobs.some(j => j.id === d.jobId)
        );
        const totalCommission = agentJobs.reduce((sum, j) => sum + (j.commissionAmount || 0), 0);
        const totalPayouts = agentTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const runningBalance = totalCommission - totalPayouts;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
              {/* Header */}
              <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#C9A05C] font-black text-lg">
                    {profileModalAgent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{profileModalAgent.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          profileModalAgent.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : profileModalAgent.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {profileModalAgent.status}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {profileModalAgent.companyName || 'Independent Sub-Agent'} • ID: {profileModalAgent.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setProfileModalAgent(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* 1. Registration & Identification Grid */}
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Agent Registration &amp; Contact Credentials</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-4 border border-slate-800 rounded-xl">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Email Address</span>
                      <span className="font-semibold text-slate-200">{profileModalAgent.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Phone Number</span>
                      <span className="font-semibold text-slate-200">{profileModalAgent.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Emirates ID / Passport</span>
                      <span className="font-semibold text-slate-200">{profileModalAgent.emiratesIdOrPassport || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Company Name</span>
                      <span className="font-semibold text-slate-200">{profileModalAgent.companyName || 'None'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block text-[10px]">Office / Residential Address</span>
                      <span className="font-semibold text-slate-200">{profileModalAgent.address || 'Ajman / UAE'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Date of Registration</span>
                      <span className="font-mono text-slate-300">{formatDate(profileModalAgent.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Date of Admin Approval</span>
                      <span className="font-mono text-slate-300">
                        {profileModalAgent.approvalDate ? formatDate(profileModalAgent.approvalDate) : 'Pending / Not Recorded'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Financial & Commission Ledger Overview */}
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <WalletCards className="w-3.5 h-3.5" />
                    <span>Financial &amp; Commission Ledger</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                      <span className="text-slate-400 text-[11px] block">Total Commission Earned</span>
                      <span className="text-lg font-black text-amber-300">{formatAED(totalCommission)}</span>
                      <span className="text-[10px] text-slate-500 block">{agentJobs.length} total job(s)</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                      <span className="text-slate-400 text-[11px] block">Total Payouts Handed Over</span>
                      <span className="text-lg font-black text-rose-400">{formatAED(totalPayouts)}</span>
                      <span className="text-[10px] text-slate-500 block">{agentTxns.length} payment entries</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                      <span className="text-slate-400 text-[11px] block">Net Outstanding Balance</span>
                      <span className={`text-lg font-black ${runningBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatAED(runningBalance)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Due to Agent</span>
                    </div>
                  </div>
                </div>

                {/* 3. Job History */}
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Submitted Jobs &amp; Processing History ({agentJobs.length})</span>
                  </h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Job ID</th>
                          <th className="py-2.5 px-3">Client</th>
                          <th className="py-2.5 px-3">Service Type</th>
                          <th className="py-2.5 px-3 text-right">Job Price</th>
                          <th className="py-2.5 px-3 text-right">Commission</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {agentJobs.map(j => (
                          <tr key={j.id} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3 font-mono text-[#C9A05C]">{j.id}</td>
                            <td className="py-2 px-3 text-white font-semibold">{j.clientNameEn}</td>
                            <td className="py-2 px-3 text-slate-300">{j.type}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">{formatAED(j.price)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">
                              {j.commissionAmount ? formatAED(j.commissionAmount) : 'Pending'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                {j.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {agentJobs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-500">
                              No jobs logged under this sub-agent yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Submitted Documents */}
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Uploaded &amp; Attached Documents ({agentDocs.length})</span>
                  </h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Document Name</th>
                          <th className="py-2.5 px-3">Linked Job / Client</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">File</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {agentDocs.map(d => (
                          <tr key={d.id} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3 font-semibold text-white">{d.name}</td>
                            <td className="py-2 px-3 text-slate-400">{d.clientName || d.jobId || 'General'}</td>
                            <td className="py-2 px-3 text-slate-400">{formatDate(d.uploadedAt)}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                {d.status || 'Received'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 hover:text-amber-300 font-bold underline"
                              >
                                View File
                              </a>
                            </td>
                          </tr>
                        ))}
                        {agentDocs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500">
                              No uploaded documents found for this sub-agent.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {profileModalAgent.status !== 'active' && (
                    <button
                      onClick={async () => {
                        await handleUpdateStatus(profileModalAgent.id, 'active');
                        setProfileModalAgent({ ...profileModalAgent, status: 'active' });
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                    >
                      Approve &amp; Activate
                    </button>
                  )}
                  {profileModalAgent.status === 'active' && (
                    <button
                      onClick={async () => {
                        await handleUpdateStatus(profileModalAgent.id, 'blocked');
                        setProfileModalAgent({ ...profileModalAgent, status: 'blocked' });
                      }}
                      className="px-3 py-1.5 bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-700/60 font-bold rounded-lg text-xs"
                    >
                      Block Account
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setProfileModalAgent(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Sub-Agent Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C9A05C]" />
                <h3 className="text-base font-bold text-white">Edit Sub-Agent Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name / Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company / Typing Agency Name
                  </label>
                  <input
                    type="text"
                    value={editCompanyName}
                    onChange={e => setEditCompanyName(e.target.value)}
                    placeholder="e.g. Al Majed Typing Services"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as UserStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="pending">Pending Approval</option>
                    <option value="blocked">Suspended / Blocked</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isEditSaving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shadow disabled:opacity-50"
                >
                  {isEditSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password-Protected Confirm Deletion Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        itemType="Sub-Agent Account"
        itemName={deleteModalState.userName}
        warningMessage="Deleting this sub-agent account will permanently remove their access credentials, linked records, and commission settings from the system."
        currentUser={currentUser}
        onClose={() => setDeleteModalState({ isOpen: false, userId: '', userName: '' })}
        onConfirm={handleConfirmDeleteUser}
      />
    </div>
  );
};
