import React, { useState, useEffect } from 'react';
import { User, Job, Client, JobStatus } from '../types.ts';
import { api } from '../services/api.ts';
import { formatAED, formatDate } from '../utils/formatters.ts';
import { SERVICE_CATEGORIES } from '../constants.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { isMasterAdmin, logRoleDetection } from '../utils/auth.ts';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Kanban,
  Table as TableIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  XCircle,
  Edit3,
  Trash2,
  DollarSign,
  User as UserIcon,
  Building2,
  Calendar,
  X,
  UploadCloud,
  FileText,
  Receipt,
  Paperclip,
} from 'lucide-react';

export type JobDocTypeLabel = 'Passport Copy' | 'Emirates ID' | 'Photo' | 'Other';

interface AttachedJobFile {
  id: string;
  typeLabel: JobDocTypeLabel;
  file: File;
  customNote?: string;
}

interface JobManagementProps {
  currentUser: User;
  jobs: Job[];
  clients: Client[];
  subAgents: User[];
  onRefreshJobs: () => void;
  onOpenCreateInvoiceForJob?: (job: Job) => void;
  onOpenCreateAgreementForJob?: (job: Job) => void;
}

export const JobManagement: React.FC<JobManagementProps> = ({
  currentUser,
  jobs,
  clients,
  subAgents,
  onRefreshJobs,
  onOpenCreateInvoiceForJob,
  onOpenCreateAgreementForJob,
}) => {
  const isMaster = isMasterAdmin(currentUser);

  useEffect(() => {
    logRoleDetection('JobManagement', currentUser);
  }, [currentUser]);

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Attached files for one-step job submission
  const [jobFiles, setJobFiles] = useState<AttachedJobFile[]>([]);
  const [submissionSuccessData, setSubmissionSuccessData] = useState<{
    job: Job;
    uploadedFiles: { name: string; typeLabel: string }[];
  } | null>(null);

  const isRecentlyUpdated = (dateStr?: string) => {
    if (!dateStr) return false;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return false;
    return Date.now() - time < 24 * 60 * 60 * 1000;
  };

  // Form state
  const [clientMode, setClientMode] = useState<'walkin' | 'existing'>('walkin');
  const [clientId, setClientId] = useState('');
  const [walkinNameEn, setWalkinNameEn] = useState('');
  const [walkinNameAr, setWalkinNameAr] = useState('');
  const [walkinPassport, setWalkinPassport] = useState('');
  const [walkinEmiratesId, setWalkinEmiratesId] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [agentId, setAgentId] = useState('');
  const [type, setType] = useState(SERVICE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('CORE LINK Operations Team');
  const [status, setStatus] = useState<JobStatus>('Pending');
  const [cost, setCost] = useState('0');
  const [price, setPrice] = useState('0');
  const [commissionAmount, setCommissionAmount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Sub-Agent Report Payment Received state
  const [isReportPaymentModalOpen, setIsReportPaymentModalOpen] = useState(false);
  const [reportingJob, setReportingJob] = useState<Job | null>(null);
  const [reportAmount, setReportAmount] = useState('');
  const [reportMethod, setReportMethod] = useState('Cash');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportPayerName, setReportPayerName] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [reportingLoading, setReportingLoading] = useState(false);

  // Job Document Attachment state
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [docUploadingJob, setDocUploadingJob] = useState<Job | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNotes, setDocNotes] = useState('');
  const [docUploading, setDocUploading] = useState(false);

  // Filtered jobs
  const filteredJobs = jobs.filter(j => {
    const term = search.toLowerCase();
    const matchesSearch =
      (j.clientNameEn && j.clientNameEn.toLowerCase().includes(term)) ||
      (j.type && j.type.toLowerCase().includes(term)) ||
      (j.id && j.id.toLowerCase().includes(term)) ||
      (j.description && j.description.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    const matchesService = serviceFilter === 'all' || j.type === serviceFilter;

    return matchesSearch && matchesStatus && matchesService;
  });

  const kanbanColumns: { status: JobStatus; title: string; color: string; icon: any }[] = [
    { status: 'Pending', title: 'Pending Review', color: 'border-amber-500/40 text-amber-300', icon: Clock },
    { status: 'In Progress', title: 'In Progress', color: 'border-blue-500/40 text-blue-300', icon: AlertCircle },
    { status: 'Completed', title: 'Completed', color: 'border-emerald-500/40 text-emerald-300', icon: CheckCircle2 },
    { status: 'Delivered', title: 'Delivered', color: 'border-purple-500/40 text-purple-300', icon: Truck },
    { status: 'Cancelled', title: 'Cancelled / Rejected', color: 'border-rose-500/40 text-rose-300', icon: XCircle },
  ];

  const openCreateModal = () => {
    setEditingJob(null);
    setJobFiles([]);
    setClientMode('walkin');
    setWalkinNameEn('');
    setWalkinNameAr('');
    setWalkinPassport('');
    setWalkinEmiratesId('');
    setWalkinPhone('');
    setClientId(clients[0]?.id || '');
    setAgentId(isMaster ? '' : currentUser.id);
    setType(SERVICE_CATEGORIES[0]);
    setDescription('');
    setAssignedTo('CORE LINK Operations Team');
    setStatus(isMaster ? 'In Progress' : 'Pending');
    setCost('0');
    setPrice('0');
    setCommissionAmount('0');
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setClientMode('existing');
    setClientId(job.clientId);
    setAgentId(job.agentId || '');
    setType(job.type);
    setDescription(job.description);
    setAssignedTo(job.assignedTo || 'CORE LINK Operations Team');
    setStatus(job.status);
    setCost(String(job.cost));
    setPrice(String(job.price));
    setCommissionAmount(String(job.commissionAmount));
    setDueDate(job.dueDate);
    setIsModalOpen(true);
  };

  const openReportPaymentModal = (job: Job) => {
    setReportingJob(job);
    setReportAmount('');
    setReportMethod('Cash');
    setReportDate(new Date().toISOString().split('T')[0]);
    setReportPayerName(job.clientNameEn || '');
    setReportNotes('');
    setIsReportPaymentModalOpen(true);
  };

  const handleReportPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingJob) return;
    if (!reportAmount || Number(reportAmount) <= 0) {
      alert('Please enter a valid amount collected from customer in AED.');
      return;
    }
    setReportingLoading(true);
    try {
      await api.reportJobPayment(currentUser, reportingJob.id, {
        amount: Number(reportAmount),
        method: reportMethod,
        date: reportDate,
        payerName: reportPayerName.trim() || reportingJob.clientNameEn,
        notes: reportNotes.trim() || undefined,
      });
      setIsReportPaymentModalOpen(false);
      alert('Payment report submitted successfully to Master Admin for confirmation!');
      onRefreshJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to submit payment report');
    } finally {
      setReportingLoading(false);
    }
  };

  const openUploadDocModal = (job: Job) => {
    setDocUploadingJob(job);
    setDocFile(null);
    setDocNotes('');
    setIsUploadDocModalOpen(true);
  };

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadingJob || !docFile) {
      alert('Please select a PDF, JPG, or PNG document file to upload.');
      return;
    }
    setDocUploading(true);
    try {
      await api.uploadDocument(currentUser, docFile, {
        clientId: docUploadingJob.clientId,
        jobId: docUploadingJob.id,
        notes: docNotes.trim() || undefined,
      });
      setIsUploadDocModalOpen(false);
      setDocFile(null);
      setDocNotes('');
      alert('Document uploaded successfully and queued for Master Admin review!');
      onRefreshJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setDocUploading(false);
    }
  };

  const handleQuickStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      await api.updateJob(currentUser, jobId, { status: newStatus });
      onRefreshJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to update job status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let targetClientId = clientId;
      let walkinPayload: any = undefined;

      if (!editingJob && clientMode === 'walkin') {
        if (!walkinNameEn.trim()) {
          alert('Please enter customer name in English.');
          setLoading(false);
          return;
        }
        walkinPayload = {
          nameEn: walkinNameEn.trim(),
          nameAr: walkinNameAr.trim() || undefined,
          passportNo: walkinPassport.trim() || undefined,
          emiratesId: walkinEmiratesId.trim() || undefined,
          phone: walkinPhone.trim() || undefined,
        };

        // Auto-save lightweight client record in background
        try {
          const createdClient = await api.createClient(currentUser, {
            nameEn: walkinPayload.nameEn,
            nameAr: walkinPayload.nameAr,
            passportNo: walkinPayload.passportNo,
            emiratesId: walkinPayload.emiratesId,
            phone: walkinPayload.phone,
            address: 'Walk-in Customer (Ajman)',
          });
          targetClientId = createdClient.id;
        } catch {
          // Backend /api/jobs will create walkinClient if client-side auto-create fails
        }
      } else {
        if (!targetClientId) {
          alert('Please select a client for this job.');
          setLoading(false);
          return;
        }
      }

      const payload: any = {
        clientId: targetClientId,
        walkinClient: walkinPayload,
        agentId: isMaster ? (agentId || undefined) : currentUser.id,
        type,
        description,
        assignedTo,
        status,
        cost: Number(cost) || 0,
        price: Number(price) || 0,
        commissionAmount: isMaster ? (Number(commissionAmount) || 0) : 0,
        dueDate,
      };

      if (editingJob) {
        await api.updateJob(currentUser, editingJob.id, payload);
        setIsModalOpen(false);
        onRefreshJobs();
      } else {
        const createdJob = await api.createJob(currentUser, payload);
        const uploadedSuccessList: { name: string; typeLabel: string }[] = [];

        if (jobFiles.length > 0) {
          for (const item of jobFiles) {
            try {
              await api.uploadDocument(currentUser, item.file, {
                clientId: createdJob.clientId,
                jobId: createdJob.id,
                notes: `[${item.typeLabel}]${item.customNote ? ` - ${item.customNote}` : ''}`,
              });
              uploadedSuccessList.push({ name: item.file.name, typeLabel: item.typeLabel });
            } catch (upErr) {
              console.error('Failed to upload linked job document:', upErr);
            }
          }
        }

        setIsModalOpen(false);
        setJobFiles([]);
        setSubmissionSuccessData({
          job: createdJob,
          uploadedFiles: uploadedSuccessList,
        });
        onRefreshJobs();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  // Deletion confirmation modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    jobId: string;
    jobTitle: string;
  }>({
    isOpen: false,
    jobId: '',
    jobTitle: '',
  });

  const handleDeleteJob = (id: string) => {
    const j = jobs.find(job => job.id === id);
    const title = j ? `${j.type} - ${j.clientNameEn} (${j.id})` : `Job ${id}`;
    setDeleteModalState({
      isOpen: true,
      jobId: id,
      jobTitle: title,
    });
  };

  const handleConfirmDeleteJob = async () => {
    if (!deleteModalState.jobId) return;
    await api.deleteJob(currentUser, deleteModalState.jobId);
    onRefreshJobs();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#C9A05C]" />
            {isMaster ? 'Job & Task Management' : 'My Service Requests'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isMaster
              ? 'Oversee workflow, adjust custom AED commissions per job, track company cost, price, and auto net profit'
              : 'Submit applications directly to Master Admin and monitor status in real-time'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'kanban' ? 'bg-[#C9A05C] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'table' ? 'bg-[#C9A05C] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isMaster ? 'Create Job' : 'Submit New Job'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client, service type, or job ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C]"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C] max-w-[200px]"
          >
            <option value="all">All Service Types</option>
            {SERVICE_CATEGORIES.map((cat, i) => (
              <option key={i} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===================== KANBAN VIEW ===================== */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map(col => {
            const columnJobs = filteredJobs.filter(j => j.status === col.status);
            const Icon = col.icon;
            return (
              <div
                key={col.status}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg min-h-[300px] flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${col.color}`} />
                    <span className="font-bold text-xs text-white">{col.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800">
                    {columnJobs.length}
                  </span>
                </div>

                {/* Job Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-1">
                  {columnJobs.map(job => (
                    <div
                      key={job.id}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-md space-y-2.5 transition group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-[#C9A05C]">{job.id}</span>
                          {isRecentlyUpdated(job.updatedAt || job.createdAt) && (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Updated
                            </span>
                          )}
                        </div>
                        {isMaster && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => openEditModal(job)}
                              className="p-1 hover:text-amber-300 text-slate-400"
                              title="Edit Job"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-1 hover:text-rose-400 text-slate-400"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-xs text-white leading-snug">{job.clientNameEn}</div>
                        <div className="text-[11px] text-amber-200/80 font-medium mt-0.5">{job.type}</div>
                      </div>

                      {job.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {job.description}
                        </p>
                      )}

                      {/* Agent badge if linked */}
                      {job.agentName && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded">
                          <Building2 className="w-2.5 h-2.5 text-[#C9A05C]" />
                          <span className="truncate">{job.agentName}</span>
                        </div>
                      )}

                      {/* Financial info */}
                      <div className="pt-2 border-t border-slate-900 text-[10px] space-y-1">
                        {isMaster ? (
                          <>
                            <div className="flex justify-between text-slate-400">
                              <span>Price: <strong className="text-white">{formatAED(job.price)}</strong></span>
                              <span>Cost: <strong className="text-rose-300">{formatAED(job.cost)}</strong></span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-300">
                                Comm: <strong>{formatAED(job.commissionAmount)}</strong>
                              </span>
                              <span className="text-emerald-400 font-bold">
                                Profit: {formatAED(job.profit)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Your Commission:</span>
                            <span className="font-bold text-amber-300">
                              {job.commissionAmount ? formatAED(job.commissionAmount) : 'Pending Review'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick Status Advancement (Master Admin only) */}
                      {isMaster && (
                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Move status:</span>
                          <select
                            value={job.status}
                            onChange={e => handleQuickStatusChange(job.id, e.target.value as JobStatus)}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      )}

                      {/* Action buttons on Kanban card */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => openReportPaymentModal(job)}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded font-semibold transition cursor-pointer text-[10px]"
                          title="Report client payment collected"
                        >
                          <Receipt className="w-3 h-3 text-emerald-400" />
                          <span>Report Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openUploadDocModal(job)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-semibold transition cursor-pointer text-[10px]"
                          title="Upload passport or document"
                        >
                          <UploadCloud className="w-3 h-3 text-[#C9A05C]" />
                          <span>Attach Doc</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {columnJobs.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-slate-600">
                      No jobs in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== TABLE VIEW ===================== */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Service Type</th>
                  <th className="py-3 px-4">Linked Sub-Agent</th>
                  <th className="py-3 px-4">Status</th>
                  {isMaster && (
                    <>
                      <th className="py-3 px-4">Price (AED)</th>
                      <th className="py-3 px-4">Cost (AED)</th>
                      <th className="py-3 px-4 text-amber-300">Commission (AED)</th>
                      <th className="py-3 px-4 text-emerald-400">Net Profit</th>
                    </>
                  )}
                  {!isMaster && <th className="py-3 px-4 text-amber-300">Your Commission</th>}
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-[#C9A05C]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{job.id}</span>
                        {isRecentlyUpdated(job.updatedAt || job.createdAt) && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                            Updated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {job.clientNameEn}
                      {job.clientNameAr && <div className="text-[10px] text-slate-400 font-arabic">{job.clientNameAr}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{job.type}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {job.agentName || <span className="text-slate-600 italic">Direct</span>}
                    </td>
                    <td className="py-3 px-4">
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
                    {isMaster && (
                      <>
                        <td className="py-3 px-4 font-semibold text-white">{formatAED(job.price)}</td>
                        <td className="py-3 px-4 text-rose-300">{formatAED(job.cost)}</td>
                        <td className="py-3 px-4 font-bold text-amber-300">{formatAED(job.commissionAmount)}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">{formatAED(job.profit)}</td>
                      </>
                    )}
                    {!isMaster && (
                      <td className="py-3 px-4 font-bold text-amber-300">
                        {job.commissionAmount ? formatAED(job.commissionAmount) : 'Pending Review'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-slate-400">{formatDate(job.dueDate)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openReportPaymentModal(job)}
                          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded font-semibold text-[10px] flex items-center gap-1 transition cursor-pointer"
                          title="Report client payment collected"
                        >
                          <Receipt className="w-3 h-3 text-emerald-400" />
                          <span>Report Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openUploadDocModal(job)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded font-semibold text-[10px] flex items-center gap-1 transition cursor-pointer"
                          title="Upload passport or document"
                        >
                          <UploadCloud className="w-3 h-3 text-[#C9A05C]" />
                          <span>Attach Doc</span>
                        </button>

                        {isMaster && (
                          <>
                            <button
                              onClick={() => openEditModal(job)}
                              className="p-1 hover:text-white text-slate-400"
                              title="Edit Job & Commission"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onOpenCreateInvoiceForJob && (
                              <button
                                onClick={() => onOpenCreateInvoiceForJob(job)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] font-semibold"
                              >
                                Invoice
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-1 hover:text-rose-400 text-slate-500"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#C9A05C]" />
                {editingJob ? 'Edit Job & Commission Settings' : isMaster ? 'Create New Job' : 'Submit New Client Job'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Client Selection (Walk-in vs Existing) */}
              {!editingJob ? (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Client Selection Type
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setClientMode('walkin')}
                      className={`py-2 px-3 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        clientMode === 'walkin'
                          ? 'bg-gradient-to-r from-[#C9A05C] to-amber-600 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Walk-in / New Customer</span>
                      <span className="text-[9px] bg-slate-950/40 px-1.5 py-0.5 rounded uppercase font-mono">Quick</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMode('existing')}
                      className={`py-2 px-3 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        clientMode === 'existing'
                          ? 'bg-gradient-to-r from-[#C9A05C] to-amber-600 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Select Existing Client</span>
                    </button>
                  </div>

                  {clientMode === 'walkin' ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Customer Name (English) *
                          </label>
                          <input
                            type="text"
                            required
                            value={walkinNameEn}
                            onChange={e => setWalkinNameEn(e.target.value)}
                            placeholder="e.g. Johnathan Smith"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Customer Name (Arabic, optional)
                          </label>
                          <input
                            type="text"
                            dir="rtl"
                            value={walkinNameAr}
                            onChange={e => setWalkinNameAr(e.target.value)}
                            placeholder="مثال: جون سميث"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-arabic"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Passport No. (optional)
                          </label>
                          <input
                            type="text"
                            value={walkinPassport}
                            onChange={e => setWalkinPassport(e.target.value)}
                            placeholder="e.g. N12345678"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Emirates ID (optional)
                          </label>
                          <input
                            type="text"
                            value={walkinEmiratesId}
                            onChange={e => setWalkinEmiratesId(e.target.value)}
                            placeholder="784-XXXX-XXXXXXX-X"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Phone (optional)
                          </label>
                          <input
                            type="text"
                            value={walkinPhone}
                            onChange={e => setWalkinPhone(e.target.value)}
                            placeholder="05X XXX XXXX"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        * Walk-in customer record will be automatically created in the background for permanent audit tracking.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Select Registered Client *
                      </label>
                      <select
                        required
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                      >
                        <option value="">-- Select Client Profile --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nameEn} {c.passportNo ? `(Passport: ${c.passportNo})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingJob.clientNameEn}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Service Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Service / Activity Category *
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  {SERVICE_CATEGORIES.map((cat, i) => (
                    <option key={i} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Admin Sub-Agent assignment */}
              {isMaster && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Originating Sub-Agent (Optional)
                    </label>
                    <select
                      value={agentId}
                      onChange={e => setAgentId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      <option value="">None (Direct Company Service)</option>
                      {subAgents.map(ag => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} {ag.companyName ? `(${ag.companyName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Assigned Team Member
                    </label>
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Job Description &amp; Processing Instructions
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. 2-year partner visa renewal typing, medical appointment booking, and Emirates ID biometric follow-up"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              {/* Status and Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Workflow Status
                  </label>
                  <select
                    value={status}
                    disabled={!isMaster && editingJob !== null}
                    onChange={e => setStatus(e.target.value as JobStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C] disabled:opacity-50"
                  >
                    <option value="Pending">Pending Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              {/* Master Admin Pricing & Custom AED Commission */}
              {isMaster && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Financial Calculations (Auto Net Profit = Price - Cost - Commission)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Price to Customer (AED)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Cost to Company (AED)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cost}
                        onChange={e => setCost(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                        Sub-Agent Commission (AED)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={commissionAmount}
                        onChange={e => setCommissionAmount(e.target.value)}
                        placeholder="Custom AED amount"
                        className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs text-amber-200 font-bold"
                      />
                    </div>
                  </div>

                  {/* Calculated Profit Indicator */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Calculated Net Company Profit:</span>
                    <span className="font-extrabold text-sm text-emerald-400">
                      {formatAED(Number(price || 0) - Number(cost || 0) - Number(commissionAmount || 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* ================= ONE-STEP DOCUMENT ATTACHMENT SECTION ================= */}
              {!editingJob && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-[#C9A05C]" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Attach Customer Documents (One-Step Submit)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Attach required client documents directly below. Files will be uploaded and linked to this job automatically in a single submit action.
                  </p>

                  {/* Labeled Quick Add Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Passport Copy', 'Emirates ID', 'Photo', 'Other'] as JobDocTypeLabel[]).map(typeLabel => (
                      <label
                        key={typeLabel}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-[#C9A05C] transition cursor-pointer flex flex-col items-center text-center group"
                      >
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setJobFiles(prev => [
                                ...prev,
                                {
                                  id: `jdoc-${Date.now()}-${Math.random()}`,
                                  typeLabel,
                                  file,
                                },
                              ]);
                            }
                            e.target.value = '';
                          }}
                        />
                        <span className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300 transition">
                          + {typeLabel}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Click to choose</span>
                      </label>
                    ))}
                  </div>

                  {/* Attached Files List */}
                  {jobFiles.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>Attached Files ({jobFiles.length}):</span>
                        <span className="text-[10px] text-emerald-400 font-medium">Ready to upload on submit</span>
                      </div>
                      <div className="divide-y divide-slate-800/80 max-h-40 overflow-y-auto pr-1">
                        {jobFiles.map((item, idx) => (
                          <div key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded bg-[#C9A05C]/15 border border-[#C9A05C]/30 text-[#C9A05C] font-mono text-[10px] shrink-0 font-bold">
                                {item.typeLabel}
                              </span>
                              <span className="font-medium text-white truncate max-w-[200px]" title={item.file.name}>
                                {item.file.name}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                ({(item.file.size / 1024).toFixed(0)} KB)
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.typeLabel === 'Other' && (
                                <input
                                  type="text"
                                  placeholder="Doc label..."
                                  value={item.customNote || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setJobFiles(prev =>
                                      prev.map((f, i) => (i === idx ? { ...f, customNote: val } : f))
                                    );
                                  }}
                                  className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-0.5 text-[10px] w-28"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => setJobFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                                title="Remove file"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                  {loading
                    ? 'Submitting...'
                    : editingJob
                    ? 'Update Job Details'
                    : jobFiles.length > 0
                    ? `Submit Job & Upload ${jobFiles.length} File(s)`
                    : 'Submit Job Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SUBMISSION SUCCESS CONFIRMATION MODAL ================= */}
      {submissionSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">Job Submitted Successfully!</h3>
              <p className="text-xs text-slate-300">
                Your client job and attached documents have been registered in the system.
              </p>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400">Job Reference ID:</span>
                <span className="font-mono font-bold text-amber-300">{submissionSuccessData.job.id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400">Customer Name:</span>
                <span className="font-bold text-white">{submissionSuccessData.job.clientNameEn}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400">Service Category:</span>
                <span className="text-slate-200">{submissionSuccessData.job.type}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400">Workflow Status:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {submissionSuccessData.job.status} (Queued for Processing)
                </span>
              </div>

              {/* Uploaded Documents List */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C9A05C]" />
                  <span>Attached &amp; Linked Documents ({submissionSuccessData.uploadedFiles.length})</span>
                </div>
                {submissionSuccessData.uploadedFiles.length > 0 ? (
                  <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    {submissionSuccessData.uploadedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-slate-300">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[9px] font-bold border border-emerald-500/30">
                          {f.typeLabel}
                        </span>
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No document attachments were included.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmissionSuccessData(null);
                  openCreateModal();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Submit Another Job
              </button>
              <button
                type="button"
                onClick={() => setSubmissionSuccessData(null)}
                className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                Done / View in Job Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUB-AGENT REPORT PAYMENT RECEIVED MODAL ===================== */}
      {isReportPaymentModalOpen && reportingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Report Payment Received</h3>
              </div>
              <button
                onClick={() => setIsReportPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportPaymentSubmit} className="p-5 space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="text-slate-400">
                  Job Reference: <span className="font-mono text-[#C9A05C] font-bold">{reportingJob.id}</span>
                </div>
                <div className="text-white font-semibold">{reportingJob.type}</div>
                <div className="text-slate-400">Client: {reportingJob.clientNameEn}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount Collected from Customer (AED) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={reportAmount}
                  onChange={e => setReportAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base text-white font-bold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={reportMethod}
                    onChange={e => setReportMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="Cash">Cash Handover</option>
                    <option value="Bank Transfer">Bank Transfer (IBAN)</option>
                    <option value="Card">Card Payment</option>
                    <option value="Cheque">Cheque Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Collection Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer / Payer Name
                </label>
                <input
                  type="text"
                  value={reportPayerName}
                  onChange={e => setReportPayerName(e.target.value)}
                  placeholder="e.g. Client Name or Company Representative"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarks / Deposit Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reportNotes}
                  onChange={e => setReportNotes(e.target.value)}
                  placeholder="Receipt number, branch handed over to, or voucher note..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                This payment report creates a &quot;Pending Confirmation&quot; transaction for Master Admin verification. Once approved, it will be posted directly to the official company ledger.
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportingLoading}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow"
                >
                  {reportingLoading ? 'Submitting...' : 'Submit Payment Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== UPLOAD ATTACHED DOCUMENT MODAL ===================== */}
      {isUploadDocModalOpen && docUploadingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#C9A05C]" />
                <h3 className="text-base font-bold text-white">Attach Document to Job</h3>
              </div>
              <button
                onClick={() => setIsUploadDocModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocSubmit} className="p-5 space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="text-slate-400">
                  Target Job: <span className="font-mono text-[#C9A05C] font-bold">{docUploadingJob.id}</span>
                </div>
                <div className="text-white font-semibold">{docUploadingJob.type}</div>
                <div className="text-slate-400">Client: {docUploadingJob.clientNameEn}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select File (PDF, JPG, PNG - Max 10MB) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      if (f.size > 10 * 1024 * 1024) {
                        alert('File exceeds 10MB limit.');
                        e.target.value = '';
                        return;
                      }
                      setDocFile(f);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#C9A05C] file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Notes (e.g. Passport copy, Emirates ID, visa approval)
                </label>
                <textarea
                  rows={2}
                  value={docNotes}
                  onChange={e => setDocNotes(e.target.value)}
                  placeholder="Notes for the review team..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
                Uploaded documents will be reviewed by Master Admin and updated through the workflow: Received &rarr; Under Review &rarr; Submitted to Authority &rarr; Approved.
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docUploading || !docFile}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shadow"
                >
                  {docUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password-Protected Confirm Deletion Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        itemType="Job Record"
        itemName={deleteModalState.jobTitle}
        warningMessage="Deleting this job record will permanently remove the application tracking, costs, pricing, and attached notes from the database."
        currentUser={currentUser}
        onClose={() => setDeleteModalState({ isOpen: false, jobId: '', jobTitle: '' })}
        onConfirm={handleConfirmDeleteJob}
      />
    </div>
  );
};
