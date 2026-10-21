import React, { useState, useEffect } from 'react';
import { User, Client, ClientDocument } from '../types.ts';
import { api } from '../services/api.ts';
import { formatDate, getExpiryStatus } from '../utils/formatters.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { isMasterAdmin, logRoleDetection } from '../utils/auth.ts';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Edit2,
  Paperclip,
  ExternalLink,
  X,
  Plus,
} from 'lucide-react';

interface ClientManagementProps {
  currentUser: User;
  clients: Client[];
  subAgents: User[];
  onRefreshClients: () => void;
  onOpenCreateJobForClient?: (client: Client) => void;
  onOpenCreateInvoiceForClient?: (client: Client) => void;
  onOpenCreateAgreementForClient?: (client: Client) => void;
}

export const ClientManagement: React.FC<ClientManagementProps> = ({
  currentUser,
  clients,
  subAgents,
  onRefreshClients,
  onOpenCreateJobForClient,
  onOpenCreateInvoiceForClient,
  onOpenCreateAgreementForClient,
}) => {
  const isMaster = isMasterAdmin(currentUser);

  useEffect(() => {
    logRoleDetection('ClientManagement', currentUser);
  }, [currentUser]);

  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring' | 'expired'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form states
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nationality, setNationality] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [emiratesId, setEmiratesId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [linkedAgentId, setLinkedAgentId] = useState('');
  const [visaExpiry, setVisaExpiry] = useState('');
  const [idExpiry, setIdExpiry] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [uploadingDocFile, setUploadingDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.nameEn.toLowerCase().includes(term) ||
      (c.nameAr && c.nameAr.includes(term)) ||
      c.passportNo.toLowerCase().includes(term) ||
      c.emiratesId.includes(term) ||
      c.phone.includes(term);

    if (!matchesSearch) return false;

    if (expiryFilter === 'all') return true;

    const vStatus = getExpiryStatus(c.visaExpiry).status;
    const lStatus = getExpiryStatus(c.licenseExpiry).status;

    if (expiryFilter === 'expired') {
      return vStatus === 'expired' || lStatus === 'expired';
    }
    if (expiryFilter === 'expiring') {
      return vStatus === 'expiring_soon' || lStatus === 'expiring_soon';
    }
    return true;
  });

  const openAddModal = () => {
    setEditingClient(null);
    setNameEn('');
    setNameAr('');
    setNationality('India');
    setPassportNo('');
    setEmiratesId('');
    setPhone('');
    setEmail('');
    setAddress('Ajman, UAE');
    setLinkedAgentId(isMaster ? '' : currentUser.id);
    setVisaExpiry('');
    setIdExpiry('');
    setLicenseExpiry('');
    setNotes('');
    setDocuments([]);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setNameEn(client.nameEn);
    setNameAr(client.nameAr || '');
    setNationality(client.nationality || '');
    setPassportNo(client.passportNo || '');
    setEmiratesId(client.emiratesId || '');
    setPhone(client.phone || '');
    setEmail(client.email || '');
    setAddress(client.address || '');
    setLinkedAgentId(client.linkedAgentId || '');
    setVisaExpiry(client.visaExpiry || '');
    setIdExpiry(client.idExpiry || '');
    setLicenseExpiry(client.licenseExpiry || '');
    setNotes(client.notes || '');
    setDocuments(client.documents || []);
    setIsModalOpen(true);
  };

  const handleAddDocument = async () => {
    if (!uploadingDocFile) {
      alert('Please choose a file to upload (PDF, JPG, PNG).');
      return;
    }
    setUploadingDoc(true);
    try {
      const doc = await api.uploadDocument(currentUser, uploadingDocFile, {
        clientId: editingClient?.id,
        notes: newDocName.trim() || uploadingDocFile.name,
      });
      setDocuments([...documents, doc]);
      setUploadingDocFile(null);
      setNewDocName('');
      alert('Document uploaded and attached successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments(documents.filter(d => d.id !== docId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<Client> = {
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        nationality: nationality.trim(),
        passportNo: passportNo.trim(),
        emiratesId: emiratesId.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        linkedAgentId: isMaster ? (linkedAgentId || undefined) : currentUser.id,
        visaExpiry: visaExpiry || undefined,
        idExpiry: idExpiry || undefined,
        licenseExpiry: licenseExpiry || undefined,
        notes: notes.trim(),
        documents,
      };

      if (editingClient) {
        await api.updateClient(currentUser, editingClient.id, payload);
      } else {
        await api.createClient(currentUser, payload);
      }

      setIsModalOpen(false);
      onRefreshClients();
    } catch (err: any) {
      alert(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  // Deletion modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    clientId: string;
    clientName: string;
  }>({
    isOpen: false,
    clientId: '',
    clientName: '',
  });

  const handleDeleteClient = (id: string, name: string) => {
    setDeleteModalState({
      isOpen: true,
      clientId: id,
      clientName: name,
    });
  };

  const handleConfirmDeleteClient = async () => {
    if (!deleteModalState.clientId) return;
    await api.deleteClient(currentUser, deleteModalState.clientId);
    onRefreshClients();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#C9A05C]" />
            {isMaster ? 'Client & Customer Database (CRM)' : 'My Client Directory'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isMaster
              ? 'Complete profiles, passports, Emirates IDs, document attachments, and expiry tracking'
              : 'Clients linked directly to your sub-agency'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, passport, Emirates ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C]"
          >
            <option value="all">All Expiries ({clients.length})</option>
            <option value="expiring">Expiring within 30 days</option>
            <option value="expired">Expired Documents</option>
          </select>
        </div>
      </div>

      {/* Client List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => {
          const visaStatus = getExpiryStatus(client.visaExpiry);
          const licenseStatus = getExpiryStatus(client.licenseExpiry);

          return (
            <div
              key={client.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group"
            >
              <div>
                {/* Client Name & ID */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-white group-hover:text-amber-300 transition">
                      {client.nameEn}
                    </h3>
                    {client.nameAr && (
                      <div className="text-xs font-semibold text-[#C9A05C] font-arabic mt-0.5">
                        {client.nameAr}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                    {client.nationality || 'UAE'}
                  </span>
                </div>

                {/* Identification & Contact Details */}
                <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Passport No:</span>
                    <span className="font-mono font-semibold text-slate-200">{client.passportNo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Emirates ID:</span>
                    <span className="font-mono font-semibold text-slate-200">{client.emiratesId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-200">{client.phone || 'N/A'}</span>
                  </div>
                  {client.email && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-slate-300 truncate max-w-[170px]">{client.email}</span>
                    </div>
                  )}
                </div>

                {/* Expiry Tracking Badges (Color-coded: Green = valid, Yellow = <=30d, Red = expired) */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Visa Expiry:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${visaStatus.badgeClass}`}>
                      {client.visaExpiry ? `${formatDate(client.visaExpiry)} (${visaStatus.label})` : 'Not set'}
                    </span>
                  </div>

                  {client.licenseExpiry && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Trade License:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${licenseStatus.badgeClass}`}>
                        {formatDate(client.licenseExpiry)} ({licenseStatus.label})
                      </span>
                    </div>
                  )}
                </div>

                {/* Attached Documents Tags */}
                {client.documents && client.documents.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                      Scanned Documents ({client.documents.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {client.documents.map(doc => (
                        <span
                          key={doc.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-medium"
                        >
                          <Paperclip className="w-2.5 h-2.5 text-[#C9A05C]" />
                          <span className="truncate max-w-[120px]">{doc.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(client)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Edit Client"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isMaster && (
                    <button
                      onClick={() => handleDeleteClient(client.id, client.nameEn)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {onOpenCreateJobForClient && (
                    <button
                      onClick={() => onOpenCreateJobForClient(client)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[11px] font-semibold transition cursor-pointer"
                    >
                      + Job
                    </button>
                  )}
                  {isMaster && onOpenCreateInvoiceForClient && (
                    <button
                      onClick={() => onOpenCreateInvoiceForClient(client)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                    >
                      + Invoice
                    </button>
                  )}
                  {isMaster && onOpenCreateAgreementForClient && (
                    <button
                      onClick={() => onOpenCreateAgreementForClient(client)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition cursor-pointer"
                    >
                      + Agreement
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-bold text-white">No clients found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or register a new client profile.</p>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#C9A05C]" />
                {editingClient ? 'Edit Client Profile' : 'Register New Client Profile'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="e.g. Johnathan Smith"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-arabic" dir="rtl">
                    الاسم باللغة العربية (Arabic Name)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    placeholder="مثال: جوناثان سميث"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-arabic focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              {/* Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={e => setNationality(e.target.value)}
                    placeholder="e.g. Pakistan, India, UAE"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Passport No.</label>
                  <input
                    type="text"
                    value={passportNo}
                    onChange={e => setPassportNo(e.target.value)}
                    placeholder="e.g. PK8849201"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Emirates ID No.</label>
                  <input
                    type="text"
                    value={emiratesId}
                    onChange={e => setEmiratesId(e.target.value)}
                    placeholder="784-xxxx-xxxxxxx-x"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="050xxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">UAE Address / Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Flat 302, Building A, Al Nuaimiya 2, Ajman"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              {/* Master Admin linking Sub-Agent */}
              {isMaster && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Linked Sub-Agent (Optional)
                  </label>
                  <select
                    value={linkedAgentId}
                    onChange={e => setLinkedAgentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="">None (Direct Company Client)</option>
                    {subAgents.map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} {ag.companyName ? `(${ag.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Expiry Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">Visa Expiry Date</label>
                  <input
                    type="date"
                    value={visaExpiry}
                    onChange={e => setVisaExpiry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Emirates ID Expiry</label>
                  <input
                    type="date"
                    value={idExpiry}
                    onChange={e => setIdExpiry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Trade License Expiry</label>
                  <input
                    type="date"
                    value={licenseExpiry}
                    onChange={e => setLicenseExpiry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Scanned Documents Real Upload Attachment */}
              <div className="space-y-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <label className="block text-xs font-semibold text-amber-300">
                  Attach Documents (PDF, JPG, PNG - Max 10MB)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        if (f.size > 10 * 1024 * 1024) {
                          alert('File size exceeds 10MB limit.');
                          e.target.value = '';
                          return;
                        }
                        setUploadingDocFile(f);
                        if (!newDocName) setNewDocName(f.name);
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-[#C9A05C] file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    placeholder="Document Title / Note"
                    className="sm:w-48 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500"
                  />
                  <button
                    type="button"
                    disabled={uploadingDoc || !uploadingDocFile}
                    onClick={handleAddDocument}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{uploadingDoc ? 'Uploading...' : 'Upload'}</span>
                  </button>
                </div>

                {documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {documents.map(doc => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300"
                      >
                        <Paperclip className="w-3 h-3 text-[#C9A05C]" />
                        <span>{doc.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="text-slate-500 hover:text-rose-400 ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special instructions, family members, or application notes..."
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
                  {loading ? 'Saving...' : editingClient ? 'Update Profile' : 'Save Client Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Password-Protected Confirm Deletion Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        itemType="Client Profile"
        itemName={deleteModalState.clientName}
        warningMessage="Deleting this client will permanently remove their profile, passport data, and document links from the database."
        currentUser={currentUser}
        onClose={() => setDeleteModalState({ isOpen: false, clientId: '', clientName: '' })}
        onConfirm={handleConfirmDeleteClient}
      />
    </div>
  );
};
