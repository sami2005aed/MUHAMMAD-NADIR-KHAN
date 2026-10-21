import React, { useState, useEffect } from 'react';
import { User, ClientDocument, DocumentStatus, Client, Job } from '../types.ts';
import { api } from '../services/api.ts';
import { formatDate } from '../utils/formatters.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { isMasterAdmin, logRoleDetection } from '../utils/auth.ts';
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  XCircle,
  ExternalLink,
  Plus,
  X,
  Building2,
  Calendar,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';

interface DocumentsModuleProps {
  currentUser: User;
  documents: ClientDocument[];
  clients: Client[];
  jobs: Job[];
  subAgents: User[];
  onRefreshDocuments: () => void;
}

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({
  currentUser,
  documents,
  clients,
  jobs,
  subAgents,
  onRefreshDocuments,
}) => {
  const isMaster = isMasterAdmin(currentUser);

  useEffect(() => {
    logRoleDetection('DocumentsModule', currentUser);
  }, [currentUser]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Edit Document Modal State
  const [editingDoc, setEditingDoc] = useState<ClientDocument | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [editDocStatus, setEditDocStatus] = useState<DocumentStatus>('Received');
  const [editDocNotes, setEditDocNotes] = useState('');
  const [isEditDocSaving, setIsEditDocSaving] = useState(false);
  const [editDocError, setEditDocError] = useState('');

  const handleOpenEditDoc = (doc: ClientDocument) => {
    setEditingDoc(doc);
    setEditDocName(doc.name);
    setEditDocStatus(doc.status || 'Received');
    setEditDocNotes(doc.notes || '');
    setEditDocError('');
  };

  const handleSaveEditDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setIsEditDocSaving(true);
    setEditDocError('');
    try {
      await api.updateDocument(currentUser, editingDoc.id, {
        name: editDocName.trim(),
        status: editDocStatus,
        notes: editDocNotes.trim(),
      });
      setEditingDoc(null);
      onRefreshDocuments();
    } catch (err: any) {
      setEditDocError(err.message || 'Failed to update document');
    } finally {
      setIsEditDocSaving(false);
    }
  };

  // Deletion Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    docId: string;
    docName: string;
  }>({
    isOpen: false,
    docId: '',
    docName: '',
  });

  const handleDeleteDoc = (doc: ClientDocument) => {
    setDeleteModalState({
      isOpen: true,
      docId: doc.id,
      docName: `${doc.name} (${doc.type || 'Document'})`,
    });
  };

  const handleConfirmDeleteDoc = async () => {
    if (!deleteModalState.docId) return;
    await api.deleteDocument(currentUser, deleteModalState.docId);
    onRefreshDocuments();
  };

  // Upload Form state
  const [file, setFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isRecentlyUpdated = (dateStr?: string) => {
    if (!dateStr) return false;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return false;
    return Date.now() - time < 24 * 60 * 60 * 1000;
  };

  const statusOptions: DocumentStatus[] = [
    'Received',
    'Under Review',
    'Submitted to Authority',
    'Approved',
    'Rejected',
  ];

  const handleUpdateStatus = async (docId: string, newStatus: DocumentStatus) => {
    try {
      setUpdatingId(docId);
      await api.updateDocumentStatus(currentUser, docId, newStatus);
      onRefreshDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to update document status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file to upload (PDF, JPG, or PNG up to 10MB).');
      return;
    }
    setUploading(true);

    try {
      await api.uploadDocument(currentUser, file, {
        clientId: selectedClientId || undefined,
        jobId: selectedJobId || undefined,
        notes: notes.trim() || undefined,
      });

      setIsUploadModalOpen(false);
      setFile(null);
      setSelectedClientId('');
      setSelectedJobId('');
      setNotes('');
      onRefreshDocuments();
      alert('Document uploaded successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // Filtered documents list
  const filteredDocs = documents.filter(doc => {
    const term = search.toLowerCase();
    const matchesSearch =
      doc.name.toLowerCase().includes(term) ||
      (doc.clientName && doc.clientName.toLowerCase().includes(term)) ||
      (doc.jobId && doc.jobId.toLowerCase().includes(term)) ||
      (doc.notes && doc.notes.toLowerCase().includes(term)) ||
      (doc.uploadedByName && doc.uploadedByName.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesClient = clientFilter === 'all' || doc.clientId === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  const counts = {
    total: documents.length,
    received: documents.filter(d => d.status === 'Received').length,
    underReview: documents.filter(d => d.status === 'Under Review').length,
    submitted: documents.filter(d => d.status === 'Submitted to Authority').length,
    approved: documents.filter(d => d.status === 'Approved').length,
    rejected: documents.filter(d => d.status === 'Rejected').length,
  };

  const getStatusBadge = (status?: DocumentStatus) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'Submitted to Authority':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <FileCheck className="w-3 h-3" />
            Submitted to Authority
          </span>
        );
      case 'Under Review':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Under Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Received
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#C9A05C]" />
            {isMaster ? 'Document Management & Verification Workflow' : 'My Document Submissions'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isMaster
              ? 'Review uploaded passports, Emirates IDs, and clearance documents. Progress statuses from Received to Approved.'
              : 'Attach client passport copies and application papers. Track official verification status in real time.'}
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Document</span>
        </button>
      </div>

      {/* KPI Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Documents</span>
          <span className="text-xl font-black text-white">{counts.total}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[11px] text-blue-400 font-semibold block">Received / New</span>
          <span className="text-xl font-black text-blue-300">{counts.received}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[11px] text-amber-400 font-semibold block">Under Review</span>
          <span className="text-xl font-black text-amber-300">{counts.underReview}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[11px] text-purple-400 font-semibold block">Submitted to Authority</span>
          <span className="text-xl font-black text-purple-300">{counts.submitted}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow col-span-2 sm:col-span-1">
          <span className="text-[11px] text-emerald-400 font-semibold block">Approved</span>
          <span className="text-xl font-black text-emerald-400">{counts.approved}</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by file name, client, job ID, notes..."
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
            <option value="all">All Statuses ({counts.total})</option>
            <option value="Received">Received ({counts.received})</option>
            <option value="Under Review">Under Review ({counts.underReview})</option>
            <option value="Submitted to Authority">Submitted to Authority ({counts.submitted})</option>
            <option value="Approved">Approved ({counts.approved})</option>
            <option value="Rejected">Rejected ({counts.rejected})</option>
          </select>

          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C] max-w-[200px]"
          >
            <option value="all">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Document / File</th>
                <th className="py-3 px-4">Associated Client &amp; Job</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Workflow Status</th>
                {isMaster && <th className="py-3 px-4">Update Status</th>}
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[#C9A05C]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-bold text-white max-w-[200px] truncate" title={doc.name}>
                            {doc.name}
                          </div>
                          {isRecentlyUpdated(doc.updatedAt || doc.uploadedAt) && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                              Updated
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Document'} • {doc.type || 'file'}
                        </div>
                        {doc.notes && (
                          <div className="text-[10px] text-amber-200/80 italic max-w-[200px] truncate">
                            &quot;{doc.notes}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {doc.clientName && (
                      <div className="font-semibold text-slate-200">{doc.clientName}</div>
                    )}
                    {doc.jobId && (
                      <div className="font-mono text-[#C9A05C] text-[10px]">{doc.jobId}</div>
                    )}
                    {!doc.clientName && !doc.jobId && (
                      <span className="text-slate-600 italic">General Submission</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    <span className="font-medium text-slate-300">{doc.uploadedByName || 'User'}</span>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {formatDate(doc.uploadedAt)}
                  </td>

                  <td className="py-3 px-4">
                    {getStatusBadge(doc.status)}
                  </td>

                  {isMaster && (
                    <td className="py-3 px-4">
                      <select
                        disabled={updatingId === doc.id}
                        value={doc.status || 'Received'}
                        onChange={e => handleUpdateStatus(doc.id, e.target.value as DocumentStatus)}
                        className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-hidden focus:border-[#C9A05C]"
                      >
                        {statusOptions.map(st => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 ml-auto">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                        title="Open Document in New Tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </a>
                      {isMaster && (
                        <>
                          <button
                            onClick={() => handleOpenEditDoc(doc)}
                            title="Edit Document Notes & Status"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc)}
                            title="Delete Document"
                            className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={isMaster ? 7 : 6} className="py-12 text-center text-slate-500">
                    No documents found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== UPLOAD DOCUMENT MODAL ===================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#C9A05C]" />
                <h3 className="text-base font-bold text-white">Upload Client / Job Document</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Document File *
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
                      setFile(f);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#C9A05C] file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Supported formats: PDF, JPG, PNG (Max 10MB per file)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Related Client (Optional)
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="">None / General</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Related Job (Optional)
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={e => setSelectedJobId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="">None / General</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.id} - {j.type} ({j.clientNameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Original Passport scan, Emirates ID front/back, Ejari tenancy contract..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shadow"
                >
                  {uploading ? 'Uploading...' : 'Save & Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C9A05C]" />
                <h3 className="text-base font-bold text-white">Edit Document Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDoc} className="p-5 space-y-4">
              {editDocError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {editDocError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Title / File Name *
                </label>
                <input
                  type="text"
                  required
                  value={editDocName}
                  onChange={e => setEditDocName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Verification &amp; Workflow Status
                </label>
                <select
                  value={editDocStatus}
                  onChange={e => setEditDocStatus(e.target.value as DocumentStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  {statusOptions.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Admin Verification Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={editDocNotes}
                  onChange={e => setEditDocNotes(e.target.value)}
                  placeholder="Official observations, ICP / typing center notes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  disabled={isEditDocSaving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditDocSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shadow disabled:opacity-50"
                >
                  {isEditDocSaving ? (
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
        itemType="Document"
        itemName={deleteModalState.docName}
        warningMessage="Deleting this client document will permanently remove the uploaded file and verification record from the system."
        currentUser={currentUser}
        onClose={() => setDeleteModalState({ isOpen: false, docId: '', docName: '' })}
        onConfirm={handleConfirmDeleteDoc}
      />
    </div>
  );
};
