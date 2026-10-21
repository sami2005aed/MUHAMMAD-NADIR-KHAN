import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Invoice,
  InvoiceStatus,
  Client,
  Job,
  CompanySettings,
  InvoiceLineItem,
} from '../types.ts';
import { api } from '../services/api.ts';
import { formatAED, formatDate } from '../utils/formatters.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';
import { InvoiceDocument } from './InvoiceDocument.tsx';
import { exportElementToPdf } from '../services/clientPdfService.ts';
import { AIClauseSuggesterModal } from './AIClauseSuggesterModal.tsx';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { isMasterAdmin, logRoleDetection } from '../utils/auth.ts';
import {
  Receipt,
  Plus,
  Printer,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  QrCode,
  X,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface InvoiceGeneratorProps {
  currentUser: User;
  invoices: Invoice[];
  clients: Client[];
  jobs: Job[];
  settings: CompanySettings;
  onRefreshInvoices: () => void;
  initialJobForInvoice?: Job | null;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  currentUser,
  invoices,
  clients,
  jobs,
  settings,
  onRefreshInvoices,
  initialJobForInvoice,
}) => {
  const isMaster = isMasterAdmin(currentUser);

  useEffect(() => {
    logRoleDetection('InvoiceGenerator', currentUser);
  }, [currentUser]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Unpaid' | 'Partially Paid'>('all');

  // Preview modal state
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  // Edit Invoice Modal State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editStatus, setEditStatus] = useState<InvoiceStatus>('Unpaid');
  const [editAmountPaid, setEditAmountPaid] = useState<number | string>(0);
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const handleOpenEditModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditStatus(inv.status);
    setEditAmountPaid(inv.amountPaid || 0);
    setEditDueDate(inv.dueDate || '');
    setEditNotes(inv.notes || '');
    setEditError('');
  };

  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setIsEditSaving(true);
    setEditError('');
    try {
      await api.updateInvoice(currentUser, editingInvoice.id, {
        status: editStatus,
        amountPaid: Number(editAmountPaid) || 0,
        dueDate: editDueDate,
        notes: editNotes,
      });
      setEditingInvoice(null);
      if (previewInvoice?.id === editingInvoice.id) {
        setPreviewInvoice({
          ...previewInvoice,
          status: editStatus as any,
          amountPaid: Number(editAmountPaid) || 0,
          dueDate: editDueDate,
          notes: editNotes,
        });
      }
      onRefreshInvoices();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update invoice');
    } finally {
      setIsEditSaving(false);
    }
  };

  // Deletion Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    invoiceId: string;
    invoiceNo: string;
  }>({
    isOpen: false,
    invoiceId: '',
    invoiceNo: '',
  });

  const handleDeleteInvoice = (inv: Invoice) => {
    setDeleteModalState({
      isOpen: true,
      invoiceId: inv.id,
      invoiceNo: `${inv.invoiceNo} - ${inv.clientNameEn} (AED ${inv.grandTotal})`,
    });
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteModalState.invoiceId) return;
    await api.deleteInvoice(currentUser, deleteModalState.invoiceId);
    if (previewInvoice?.id === deleteModalState.invoiceId) {
      setPreviewInvoice(null);
    }
    onRefreshInvoices();
  };

  // Refs for client-side DOM PDF generation
  const previewDocRef = useRef<HTMLDivElement>(null);
  const exportDocRef = useRef<HTMLDivElement>(null);
  const [downloadTargetInvoice, setDownloadTargetInvoice] = useState<Invoice | null>(null);
  const [downloadTargetQr, setDownloadTargetQr] = useState<string>('');

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientMode, setClientMode] = useState<'walkin' | 'existing'>('walkin');
  const [clientId, setClientId] = useState('');
  const [walkinNameEn, setWalkinNameEn] = useState('');
  const [walkinNameAr, setWalkinNameAr] = useState('');
  const [walkinPassport, setWalkinPassport] = useState('');
  const [walkinEmiratesId, setWalkinEmiratesId] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [jobId, setJobId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Paid' | 'Unpaid' | 'Partially Paid'>('Paid');
  const [notes, setNotes] = useState('Thank you for choosing CORE LINK Administrative Services. All transactions are subject to UAE Federal Laws and Ajman regulations.');
  const [notesAr, setNotesAr] = useState('شكراً لاختياركم كور لينك للخدمات الإدارية. تخضع كافة المعاملات للقوانين الاتحادية ولوائح إمارة عجمان.');
  const [isAISuggesterOpen, setIsAISuggesterOpen] = useState(false);
  const [aiSuggesterTopic, setAiSuggesterTopic] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: 'li-1',
      description: 'Administrative & Typing Services',
      descriptionAr: 'خدمات طباعة ومتابعة إدارية',
      quantity: 1,
      unitPrice: 1500,
      total: 1500,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Exact 1-to-1 client-side DOM PDF download from the on-screen rendered document
  const handleDownloadPdf = async (inv: Invoice) => {
    try {
      setDownloadingPdf(true);

      // Ensure QR code is ready
      let qr = previewQrUrl;
      if (!previewInvoice || previewInvoice.id !== inv.id || !qr) {
        const verifyFullUrl = `${window.location.origin}/verify/${inv.invoiceNo}`;
        qr = await generateQRCodeDataUrl(verifyFullUrl);
      }

      let targetEl: HTMLElement | null = null;
      if (previewInvoice && previewInvoice.id === inv.id && previewDocRef.current) {
        targetEl = previewDocRef.current;
      } else {
        setDownloadTargetInvoice(inv);
        setDownloadTargetQr(qr);
        await new Promise((r) => setTimeout(r, 120));
        targetEl = exportDocRef.current;
      }

      if (!targetEl) {
        throw new Error('Document view element not found for export.');
      }

      await exportElementToPdf(targetEl, `${inv.invoiceNo}.pdf`, {
        documentTitle: 'TAX / SERVICE INVOICE',
        serialNumber: inv.invoiceNo,
        tradeName: settings.tradeNameEn,
      });
    } catch (err: any) {
      console.error('Invoice PDF generation error:', err);
      alert(err.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
      setDownloadTargetInvoice(null);
    }
  };

  useEffect(() => {
    if (initialJobForInvoice) {
      setClientMode('existing');
      setClientId(initialJobForInvoice.clientId);
      setJobId(initialJobForInvoice.id);
      setLineItems([
        {
          id: `li-${Date.now()}`,
          description: initialJobForInvoice.type,
          descriptionAr: initialJobForInvoice.type,
          quantity: 1,
          unitPrice: initialJobForInvoice.price,
          total: initialJobForInvoice.price,
        },
      ]);
      setIsCreateOpen(true);
    }
  }, [initialJobForInvoice]);

  const filteredInvoices = invoices.filter(inv => {
    const term = search.toLowerCase();
    const matchTerm =
      inv.invoiceNo.toLowerCase().includes(term) ||
      inv.clientNameEn.toLowerCase().includes(term) ||
      (inv.clientNameAr && inv.clientNameAr.includes(term));

    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchTerm && matchStatus;
  });

  const handleOpenPreview = async (inv: Invoice) => {
    setPreviewInvoice(inv);
    // Generate QR code pointing to public verification page
    const verifyFullUrl = `${window.location.origin}/verify/${inv.invoiceNo}`;
    const qrData = await generateQRCodeDataUrl(verifyFullUrl);
    setPreviewQrUrl(qrData);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `li-${Date.now()}`,
        description: '',
        descriptionAr: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const handleUpdateLineItem = (index: number, field: keyof InvoiceLineItem, val: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = Number(updated[index].quantity) || 0;
      const u = Number(updated[index].unitPrice) || 0;
      updated[index].total = Math.round(q * u * 100) / 100;
    }
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const shouldChargeVat = Boolean(settings.trn?.trim() && settings.chargeVat);
  const calculatedSubtotal = lineItems.reduce((acc, item) => acc + (item.total || 0), 0);
  const calculatedVat = shouldChargeVat ? Math.round(calculatedSubtotal * 0.05 * 100) / 100 : 0;
  const calculatedGrandTotal = Math.round((calculatedSubtotal + calculatedVat) * 100) / 100;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lineItems.length === 0 || calculatedSubtotal <= 0) {
      alert('Please add at least one line item with a positive price.');
      return;
    }

    setLoading(true);
    try {
      let targetClientId = clientId;
      let walkinPayload: any = undefined;

      if (clientMode === 'walkin') {
        if (!walkinNameEn.trim()) {
          alert('Please enter the customer name in English.');
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
        } catch (err) {
          // If auto-create fails client-side, backend /api/invoices will handle walkinClient creation
        }
      } else {
        if (!targetClientId) {
          alert('Please select an existing client.');
          setLoading(false);
          return;
        }
      }

      const res = await api.createInvoice(currentUser, {
        clientId: targetClientId,
        walkinClient: walkinPayload,
        jobId: jobId || undefined,
        lineItems,
        dueDate,
        status,
        notes,
        notesAr,
      });

      setIsCreateOpen(false);
      onRefreshInvoices();
      handleOpenPreview(res);
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    try {
      await api.updateInvoiceStatus(currentUser, invoiceId, newStatus);
      onRefreshInvoices();
      if (previewInvoice && previewInvoice.id === invoiceId) {
        setPreviewInvoice({ ...previewInvoice, status: newStatus as any });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#C9A05C]" />
            Official Invoices (Bilingual EN/AR)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sequential numbering (CL-INV-YYYY-XXXX), 5% VAT calculations, and QR codes linked to the verification portal.
          </p>
        </div>

        {isMaster && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Official Invoice</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="no-print flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice number or client name..."
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
            <option value="all">All Invoices ({invoices.length})</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
          </select>
        </div>
      </div>

      {/* Invoice List Table */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice No.</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">5% VAT</th>
                <th className="py-3 px-4 font-bold text-white">Grand Total (AED)</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-bold text-[#C9A05C]">{inv.invoiceNo}</td>
                  <td className="py-3 px-4 font-semibold text-white">
                    {inv.clientNameEn}
                    {inv.clientNameAr && <div className="text-[10px] text-slate-400 font-arabic">{inv.clientNameAr}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(inv.createdAt)}</td>
                  <td className="py-3 px-4 text-slate-300">{formatAED(inv.subtotal)}</td>
                  <td className="py-3 px-4 text-slate-400">{formatAED(inv.vatAmount)}</td>
                  <td className="py-3 px-4 font-black text-amber-300">{formatAED(inv.grandTotal)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : inv.status === 'Partially Paid'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 ml-auto">
                      <button
                        onClick={() => handleDownloadPdf(inv)}
                        title="Download genuine PDF file"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[#C9A05C] hover:text-amber-300 rounded text-xs transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenPreview(inv)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      {isMaster && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(inv)}
                            title="Edit Invoice"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded text-xs transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            title="Delete Invoice"
                            className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 rounded text-xs transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No invoices match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== OFFICIAL PRINTABLE BILINGUAL INVOICE PREVIEW MODAL ===================== */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-auto print-page">
            {/* Modal Control Action Bar (Hidden when printing!) */}
            <div className="no-print bg-[#0A1A3C] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#C9A05C]" />
                <span className="font-bold text-sm">Official Bilingual Invoice: {previewInvoice.invoiceNo}</span>
              </div>

              <div className="flex items-center gap-2">
                {isMaster && (
                  <select
                    value={previewInvoice.status}
                    onChange={e => handleUpdateStatus(previewInvoice.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1 text-xs"
                  >
                    <option value="Paid">Mark as Paid</option>
                    <option value="Unpaid">Mark as Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                )}

                {isMaster && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(previewInvoice)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
                      title="Edit Invoice Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteInvoice(previewInvoice)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => handleDownloadPdf(previewInvoice)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body: Exactly One Source of Truth */}
            <div className="overflow-x-auto bg-slate-100/50 p-2 sm:p-4 print:p-0 print:bg-white">
              <div ref={previewDocRef} className="bg-white">
                <InvoiceDocument
                  invoice={previewInvoice}
                  settings={settings}
                  qrCodeUrl={previewQrUrl}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stable Export Container for 1-Click Direct Table Downloads */}
      {downloadTargetInvoice && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '794px',
            backgroundColor: '#ffffff',
            zIndex: -9999,
            opacity: 1,
            pointerEvents: 'none',
          }}
        >
          <div ref={exportDocRef} className="bg-white">
            <InvoiceDocument
              invoice={downloadTargetInvoice}
              settings={settings}
              qrCodeUrl={downloadTargetQr}
            />
          </div>
        </div>
      )}

      {/* ===================== GENERATE INVOICE MODAL ===================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#C9A05C]" />
                Generate Sequential Official Invoice
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Customer Selection Type: Walk-in vs Existing */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Customer / Client Selection
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
                    <span>Walk-in / One-Time Customer</span>
                    <span className="text-[9px] bg-slate-950/40 px-1.5 py-0.5 rounded uppercase font-mono">Default</span>
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Choose From Saved Clients *
                    </label>
                    <select
                      required={clientMode === 'existing'}
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      <option value="">-- Choose Client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nameEn} {c.passportNo ? `(Passport: ${c.passportNo})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Link to Job (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Link to Ongoing Job / Task (Optional)
                </label>
                <select
                  value={jobId}
                  onChange={e => setJobId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  <option value="">-- None / General Service --</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.id} - {j.type} ({j.clientNameEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Invoice Line Items (AED)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-[#C9A05C] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={e => handleUpdateLineItem(index, 'description', e.target.value)}
                          placeholder="Description in English (e.g. Visa Processing)"
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          value={item.descriptionAr || ''}
                          onChange={e => handleUpdateLineItem(index, 'descriptionAr', e.target.value)}
                          placeholder="الوصف بالعربية (مثال: طباعة وتجهيز تأشيرة)"
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-arabic"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <label className="text-[10px] text-slate-400 block">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateLineItem(index, 'quantity', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 block">Unit Price (AED)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e => handleUpdateLineItem(index, 'unitPrice', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-semibold"
                          />
                        </div>
                        <div className="w-28 text-right">
                          <span className="text-[10px] text-slate-400 block">Total</span>
                          <span className="text-xs font-bold text-amber-300 font-mono">
                            {formatAED(item.total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(index)}
                              className="p-1 hover:text-rose-400 text-slate-500"
                              title="Remove Line Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAiSuggesterTopic(item.description || 'Administrative Services');
                              setIsAISuggesterOpen(true);
                            }}
                            className="text-[11px] text-[#C9A05C] hover:text-amber-300 flex items-center gap-1 font-semibold transition px-2 py-1 rounded bg-[#C9A05C]/10 border border-[#C9A05C]/20 hover:bg-[#C9A05C]/20 cursor-pointer"
                            title="Suggest standard UAE-compliant terms for this service item"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span className="hidden sm:inline">Suggest Terms</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculated VAT and Total box */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <div className="text-slate-400">
                    Subtotal: <strong className="text-white">{formatAED(calculatedSubtotal)}</strong>
                  </div>
                  {shouldChargeVat ? (
                    <div className="text-slate-400">
                      5% VAT (TRN: {settings.trn}):{' '}
                      <strong className="text-amber-200">{formatAED(calculatedVat)}</strong>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic text-[11px]">
                      VAT: Not Registered (No VAT charged)
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#C9A05C] tracking-wider block">
                    Grand Total
                  </span>
                  <span className="text-lg font-black text-amber-300 font-mono">
                    {formatAED(calculatedGrandTotal)}
                  </span>
                </div>
              </div>

              {/* Additional Notes / Terms (Bilingual Free-Text) */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Additional Notes / Terms (Bilingual)
                    </label>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">&bull; Printed on official invoice</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAISuggesterOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/30 text-[#C9A05C] hover:text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    title="Draft standard UAE-compliant terms for this invoice"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Suggest UAE-Compliant Terms</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Payment Terms &amp; Remarks (English)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Remarks, terms, payment instructions..."
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 text-right">
                      الشروط والأحكام والملاحظات (العربية)
                    </label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={notesAr}
                      onChange={e => setNotesAr(e.target.value)}
                      placeholder="شروط السداد وملاحظات الفاتورة..."
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white font-arabic"
                    />
                  </div>
                </div>
              </div>

              {/* Payment status and due date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Payment Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="Paid">Paid (Recorded in General Ledger)</option>
                    <option value="Unpaid">Unpaid / Invoiced</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {loading ? 'Generating...' : 'Create & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI-Assisted Terms Suggester Modal */}
      <AIClauseSuggesterModal
        isOpen={isAISuggesterOpen}
        onClose={() => setIsAISuggesterOpen(false)}
        serviceTopic={aiSuggesterTopic || lineItems[0]?.description || 'Administrative Services'}
        documentType="invoice"
        onInsertClause={(clauseEn, clauseAr) => {
          setNotes(prev => (prev ? `${prev}\n${clauseEn}` : clauseEn));
          setNotesAr(prev => (prev ? `${prev}\n${clauseAr}` : clauseAr));
        }}
        onInsertAllClauses={(allEn, allAr) => {
          setNotes(prev => (prev ? `${prev}\n\n${allEn}` : allEn));
          setNotesAr(prev => (prev ? `${prev}\n\n${allAr}` : allAr));
        }}
      />

      {/* Edit Invoice Details Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C9A05C]" />
                <h3 className="text-base font-bold text-white">
                  Edit Invoice: {editingInvoice.invoiceNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as InvoiceStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount Paid (AED)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editAmountPaid}
                    onChange={e => setEditAmountPaid(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Internal / Payment Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Notes, payment transaction ID, or conditions..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
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
        itemType="Invoice"
        itemName={deleteModalState.invoiceNo}
        warningMessage="Deleting this official invoice will permanently remove the record, QR tracking, and revenue data from the system."
        currentUser={currentUser}
        onClose={() => setDeleteModalState({ isOpen: false, invoiceId: '', invoiceNo: '' })}
        onConfirm={handleConfirmDeleteInvoice}
      />
    </div>
  );
};
