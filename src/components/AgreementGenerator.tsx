import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Agreement,
  AgreementTemplate,
  Client,
  Job,
  CompanySettings,
} from '../types.ts';
import { api } from '../services/api.ts';
import { formatDate } from '../utils/formatters.ts';
import { generateQRCodeDataUrl } from '../utils/qr.ts';
import { AgreementDocument } from './AgreementDocument.tsx';
import { exportElementToPdf } from '../services/clientPdfService.ts';
import { AIClauseSuggesterModal } from './AIClauseSuggesterModal.tsx';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { isMasterAdmin, logRoleDetection } from '../utils/auth.ts';
import {
  FileSignature,
  Plus,
  Printer,
  Download,
  Search,
  Eye,
  Settings2,
  QrCode,
  X,
  Sparkles,
  FileCheck,
  Loader2,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface AgreementGeneratorProps {
  currentUser: User;
  agreements: Agreement[];
  templates: AgreementTemplate[];
  clients: Client[];
  jobs: Job[];
  settings: CompanySettings;
  onRefreshAgreements: () => void;
  onRefreshTemplates: () => void;
  initialJobForAgreement?: Job | null;
}

export const AgreementGenerator: React.FC<AgreementGeneratorProps> = ({
  currentUser,
  agreements,
  templates,
  clients,
  jobs,
  settings,
  onRefreshAgreements,
  onRefreshTemplates,
  initialJobForAgreement,
}) => {
  const isMaster = isMasterAdmin(currentUser);

  useEffect(() => {
    logRoleDetection('AgreementGenerator', currentUser);
  }, [currentUser]);

  const [search, setSearch] = useState('');

  // Preview state
  const [previewAgreement, setPreviewAgreement] = useState<Agreement | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  // Edit Agreement Modal State
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [editAgrStatus, setEditAgrStatus] = useState<'Valid' | 'Revoked' | 'Expired'>('Valid');
  const [editExtraTermsEn, setEditExtraTermsEn] = useState<string>('');
  const [editExtraTermsAr, setEditExtraTermsAr] = useState<string>('');
  const [isEditAgrSaving, setIsEditAgrSaving] = useState(false);
  const [editAgrError, setEditAgrError] = useState('');

  const handleOpenEditAgreement = (agr: Agreement) => {
    setEditingAgreement(agr);
    setEditAgrStatus(agr.status || 'Valid');
    setEditExtraTermsEn(agr.extraTermsEn || '');
    setEditExtraTermsAr(agr.extraTermsAr || '');
    setEditAgrError('');
  };

  const handleSaveEditAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgreement) return;
    setIsEditAgrSaving(true);
    setEditAgrError('');
    try {
      await api.updateAgreement(currentUser, editingAgreement.id, {
        status: editAgrStatus,
        extraTermsEn: editExtraTermsEn,
        extraTermsAr: editExtraTermsAr,
      });
      setEditingAgreement(null);
      if (previewAgreement?.id === editingAgreement.id) {
        setPreviewAgreement({
          ...previewAgreement,
          status: editAgrStatus,
          extraTermsEn: editExtraTermsEn,
          extraTermsAr: editExtraTermsAr,
        });
      }
      onRefreshAgreements();
    } catch (err: any) {
      setEditAgrError(err.message || 'Failed to update agreement');
    } finally {
      setIsEditAgrSaving(false);
    }
  };

  // Deletion Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    agreementId: string;
    agreementTitle: string;
  }>({
    isOpen: false,
    agreementId: '',
    agreementTitle: '',
  });

  const handleDeleteAgreement = (agr: Agreement) => {
    setDeleteModalState({
      isOpen: true,
      agreementId: agr.id,
      agreementTitle: `${agr.serialNo} - ${agr.templateName} (${agr.clientNameEn})`,
    });
  };

  const handleConfirmDeleteAgreement = async () => {
    if (!deleteModalState.agreementId) return;
    await api.deleteAgreement(currentUser, deleteModalState.agreementId);
    if (previewAgreement?.id === deleteModalState.agreementId) {
      setPreviewAgreement(null);
    }
    onRefreshAgreements();
  };

  // Refs for client-side DOM PDF generation
  const previewDocRef = useRef<HTMLDivElement>(null);
  const exportDocRef = useRef<HTMLDivElement>(null);
  const [downloadTargetAgreement, setDownloadTargetAgreement] = useState<Agreement | null>(null);
  const [downloadTargetQr, setDownloadTargetQr] = useState<string>('');

  // Generate Agreement Modal
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [clientMode, setClientMode] = useState<'walkin' | 'existing'>('walkin');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [walkinNameEn, setWalkinNameEn] = useState('');
  const [walkinNameAr, setWalkinNameAr] = useState('');
  const [walkinPassport, setWalkinPassport] = useState('');
  const [walkinEmiratesId, setWalkinEmiratesId] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [formPlaceholders, setFormPlaceholders] = useState<Record<string, string>>({});
  const [extraTermsEn, setExtraTermsEn] = useState('');
  const [extraTermsAr, setExtraTermsAr] = useState('');
  const [customTitleEn, setCustomTitleEn] = useState('General Administrative Agreement');
  const [customTitleAr, setCustomTitleAr] = useState('عقد تقديم خدمات إدارية عامة');
  const [customBodyEn, setCustomBodyEn] = useState(`This Agreement is entered into by and between CORE LINK Administrative Services (Ajman, UAE) and the Second Party (Client).
1. SCOPE OF SERVICES: The First Party agrees to provide documentation, governmental follow-up, typing, and administrative processing in accordance with UAE federal and local laws.
2. FINANCIAL CONSIDERATION: All fees and government charges are payable as mutually agreed upon.
3. TIMELINES & CLEARANCE: Processing is executed subject to official government regulatory departments and authority clearance schedules.`);
  const [customBodyAr, setCustomBodyAr] = useState(`حرر هذا العقد والاتفاق بين الطرف الأول: شركة كور لينك للخدمات الإدارية (عجمان، الإمارات) والطرف الثاني (العميل).
١. موضوع الاتفاقية: يلتزم الطرف الأول بتقديم خدمات الطباعة والمتابعة الإدارية وتخليص المعاملات وفقاً للأنظمة والقوانين المعمول بها.
٢. الأتعاب والمصروفات: يلتزم الطرف الثاني بسداد الرسوم والأتعاب الإدارية المتفق عليها فور الاستحقاق.
٣. الالتزام القانوني: يخضع هذا العقد لكافة القوانين واللوائح التنظيمية في دولة الإمارات العربية المتحدة وإمارة عجمان.`);
  const [isAISuggesterOpen, setIsAISuggesterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Exact 1-to-1 client-side DOM PDF download from the on-screen rendered document
  const handleDownloadPdf = async (agr: Agreement) => {
    try {
      setDownloadingPdf(true);

      // Ensure QR code is ready
      let qr = previewQrUrl;
      if (!previewAgreement || previewAgreement.id !== agr.id || !qr) {
        const verifyFullUrl = `${window.location.origin}/verify/${agr.serialNo}`;
        qr = await generateQRCodeDataUrl(verifyFullUrl);
      }

      let targetEl: HTMLElement | null = null;
      if (previewAgreement && previewAgreement.id === agr.id && previewDocRef.current) {
        targetEl = previewDocRef.current;
      } else {
        setDownloadTargetAgreement(agr);
        setDownloadTargetQr(qr);
        await new Promise((r) => setTimeout(r, 200));
        targetEl = exportDocRef.current;
      }

      if (!targetEl) {
        throw new Error('Agreement view element not found for export.');
      }

      await exportElementToPdf(targetEl, `${agr.serialNo}.pdf`, {
        documentTitle: agr.templateName,
        serialNumber: agr.serialNo,
        tradeName: settings.tradeNameEn,
      });
    } catch (err: any) {
      console.error('Agreement PDF export error:', err);
      alert(err.message || 'Failed to download Agreement PDF.');
    } finally {
      setDownloadingPdf(false);
      setDownloadTargetAgreement(null);
    }
  };

  // Template Management Modal (Master Admin only)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgreementTemplate | null>(null);
  const [tmplName, setTmplName] = useState('');
  const [tmplNameAr, setTmplNameAr] = useState('');
  const [tmplCategory, setTmplCategory] = useState('Visa Services');
  const [tmplBodyEn, setTmplBodyEn] = useState('');
  const [tmplBodyAr, setTmplBodyAr] = useState('');

  useEffect(() => {
    if (initialJobForAgreement) {
      setClientMode('existing');
      setSelectedClientId(initialJobForAgreement.clientId);
      if (templates.length > 0) {
        setSelectedTemplateId(templates[0].id);
      }
      const client = clients.find(c => c.id === initialJobForAgreement.clientId);
      setFormPlaceholders({
        service_details: initialJobForAgreement.type,
        amount: initialJobForAgreement.price.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        passport_no: client?.passportNo || '',
        emirates_id: client?.emiratesId || '',
        client_name: client?.nameEn || '',
      });
      setIsGenerateOpen(true);
    }
  }, [initialJobForAgreement]);

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  // Update placeholder values when client changes
  const handleClientSelect = (cId: string) => {
    setSelectedClientId(cId);
    const client = clients.find(c => c.id === cId);
    if (client) {
      setFormPlaceholders(prev => ({
        ...prev,
        client_name: client.nameEn,
        passport_no: client.passportNo || '',
        emirates_id: client.emiratesId || '',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      }));
    }
  };

  const handleOpenPreview = async (agr: Agreement) => {
    setPreviewAgreement(agr);
    const verifyFullUrl = `${window.location.origin}/verify/${agr.serialNo}`;
    const qrData = await generateQRCodeDataUrl(verifyFullUrl);
    setPreviewQrUrl(qrData);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      let targetClientId = selectedClientId;
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
          // Backend will auto-handle walkinClient if needed
        }
      } else {
        if (!targetClientId) {
          alert('Please select an existing client.');
          setLoading(false);
          return;
        }
      }

      const isBlank = selectedTemplateId === 'blank';
      if (isBlank && !customBodyEn.trim() && !customBodyAr.trim()) {
        alert('Please enter agreement clauses in English or Arabic for the custom agreement.');
        setLoading(false);
        return;
      }

      const res = await api.createAgreement(currentUser, {
        templateId: selectedTemplateId,
        clientId: targetClientId,
        walkinClient: walkinPayload,
        filledData: {
          ...formPlaceholders,
          client_name: clientMode === 'walkin' ? walkinNameEn : (formPlaceholders.client_name || ''),
          passport_no: clientMode === 'walkin' ? walkinPassport : (formPlaceholders.passport_no || ''),
          emirates_id: clientMode === 'walkin' ? walkinEmiratesId : (formPlaceholders.emirates_id || ''),
        },
        customTitleEn,
        customTitleAr,
        customBodyEn,
        customBodyAr,
        extraTermsEn,
        extraTermsAr,
      });

      setIsGenerateOpen(false);
      onRefreshAgreements();
      handleOpenPreview(res);
    } catch (err: any) {
      alert(err.message || 'Failed to generate contract agreement');
    } finally {
      setLoading(false);
    }
  };

  // Template builder
  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setTmplName('');
    setTmplNameAr('');
    setTmplCategory('General');
    setTmplBodyEn(`This Agreement is made on {{date}} between CORE LINK Administrative Services and {{client_name}} (Passport: {{passport_no}}, Emirates ID: {{emirates_id}}).
1. Service Description: {{service_details}}.
2. Consideration: AED {{amount}} payable upon submission.
3. Both parties agree to abide by UAE regulatory guidelines.`);
    setTmplBodyAr(`حرر هذا العقد بتاريخ {{date}} بين كور لينك للخدمات الإدارية والسيد/السيدة {{client_name}} (جواز سفر: {{passport_no}}، هوية إماراتية: {{emirates_id}}).
1. موضوع الخدمة: {{service_details}}.
2. الأتعاب المتفق عليها: {{amount}} درهم إماراتي.
3. يقر الطرفان بالالتزام بالقوانين المعمول بها بدولة الإمارات.`);
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (tmpl: AgreementTemplate) => {
    setEditingTemplate(tmpl);
    setTmplName(tmpl.name);
    setTmplNameAr(tmpl.nameAr);
    setTmplCategory(tmpl.category);
    setTmplBodyEn(tmpl.bodyEn);
    setTmplBodyAr(tmpl.bodyAr);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.saveTemplate(currentUser, {
        id: editingTemplate ? editingTemplate.id : undefined,
        name: tmplName,
        nameAr: tmplNameAr,
        category: tmplCategory,
        bodyEn: tmplBodyEn,
        bodyAr: tmplBodyAr,
      });

      setIsTemplateModalOpen(false);
      onRefreshTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgreements = agreements.filter(a => {
    const term = search.toLowerCase();
    return (
      a.serialNo.toLowerCase().includes(term) ||
      a.clientNameEn.toLowerCase().includes(term) ||
      a.templateName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#C9A05C]" />
            Agreement &amp; Contract Generator (Bilingual)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Replaces manual Word typing. Auto-generates bilingual EN/AR legal contracts with sequential serials (CL-AGR-YYYY-XXXX) and verification QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isMaster && (
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-[#C9A05C]" />
              <span>Manage Templates</span>
            </button>
          )}

          {isMaster && (
            <button
              onClick={() => {
                if (clients.length > 0) handleClientSelect(clients[0].id);
                setIsGenerateOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Draft New Agreement</span>
            </button>
          )}
        </div>
      </div>

      {/* Available Templates Carousel Cards */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {templates.map(tmpl => (
          <div
            key={tmpl.id}
            className="p-4 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between transition shadow-md"
          >
            <div>
              <span className="text-[10px] font-bold text-[#C9A05C] uppercase tracking-wider block mb-1">
                {tmpl.category}
              </span>
              <h3 className="font-bold text-sm text-white">{tmpl.name}</h3>
              <p className="text-xs text-slate-400 font-arabic mt-0.5" dir="rtl">{tmpl.nameAr}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">{tmpl.placeholders.length} Placeholders</span>
              {isMaster && (
                <button
                  onClick={() => openEditTemplateModal(tmpl)}
                  className="text-[#C9A05C] hover:underline font-semibold cursor-pointer"
                >
                  Edit Template &rarr;
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="no-print flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search generated agreements by serial or client..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
          />
        </div>
        <div className="text-xs text-slate-400">
          Total Generated Contracts: <strong>{agreements.length}</strong>
        </div>
      </div>

      {/* Generated Agreements Table */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Serial No.</th>
                <th className="py-3 px-4">Agreement Template</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Generated Date</th>
                <th className="py-3 px-4">Authenticity Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAgreements.map(agr => (
                <tr key={agr.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-bold text-[#C9A05C]">{agr.serialNo}</td>
                  <td className="py-3 px-4 font-semibold text-white">{agr.templateName}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {agr.clientNameEn}
                    {agr.clientNameAr && <div className="text-[10px] text-slate-400 font-arabic">{agr.clientNameAr}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(agr.createdAt)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {agr.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 ml-auto">
                      <button
                        onClick={() => handleDownloadPdf(agr)}
                        title="Download genuine PDF file"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[#C9A05C] hover:text-amber-300 rounded text-xs transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenPreview(agr)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      {isMaster && (
                        <>
                          <button
                            onClick={() => handleOpenEditAgreement(agr)}
                            title="Edit Agreement Details"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded text-xs transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgreement(agr)}
                            title="Delete Agreement"
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
              {filteredAgreements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No agreements generated yet. Select a template above to generate one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== OFFICIAL PRINTABLE AGREEMENT MODAL ===================== */}
      {previewAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-auto print-page">
            {/* Top Toolbar */}
            <div className="no-print bg-[#0A1A3C] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#C9A05C]" />
                <span className="font-bold text-sm">Official Legal Agreement: {previewAgreement.serialNo}</span>
              </div>
              <div className="flex items-center gap-2">
                {isMaster && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEditAgreement(previewAgreement)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
                      title="Edit Agreement Terms"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAgreement(previewAgreement)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                      title="Delete Agreement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => handleDownloadPdf(previewAgreement)}
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
                  onClick={() => setPreviewAgreement(null)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body: Exactly One Source of Truth */}
            <div className="overflow-x-auto bg-slate-100/50 p-2 sm:p-4 print:p-0 print:bg-white">
              <div ref={previewDocRef} className="bg-white">
                <AgreementDocument
                  agreement={previewAgreement}
                  settings={settings}
                  qrCodeUrl={previewQrUrl}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Container for 1-Click Direct Table Downloads */}
      {downloadTargetAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#C9A05C] animate-spin" />
            <div className="text-sm font-bold text-white">Generating Official PDF Document...</div>
            <div className="text-xs text-slate-400">Rendering bilingual clauses &amp; QR verification seal</div>
          </div>
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
              <AgreementDocument
                agreement={downloadTargetAgreement}
                settings={settings}
                qrCodeUrl={downloadTargetQr}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================== DRAFT NEW AGREEMENT FORM MODAL ===================== */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#C9A05C]" />
                Generate Bilingual Agreement from Template
              </h3>
              <button
                onClick={() => setIsGenerateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateAgreement} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Customer Selection: Walk-in vs Existing */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Customer / Second Party Selection
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
                    <span>Walk-in / Direct Client</span>
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
                          Client Name (English) *
                        </label>
                        <input
                          type="text"
                          required
                          value={walkinNameEn}
                          onChange={e => {
                            setWalkinNameEn(e.target.value);
                            setFormPlaceholders({ ...formPlaceholders, client_name: e.target.value });
                          }}
                          placeholder="e.g. Johnathan Smith"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Client Name (Arabic, optional)
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
                          onChange={e => {
                            setWalkinPassport(e.target.value);
                            setFormPlaceholders({ ...formPlaceholders, passport_no: e.target.value });
                          }}
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
                          onChange={e => {
                            setWalkinEmiratesId(e.target.value);
                            setFormPlaceholders({ ...formPlaceholders, emirates_id: e.target.value });
                          }}
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
                      * Walk-in customer record will be auto-saved into the client directory for future reference and legal auditing.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Choose From Saved Clients *
                    </label>
                    <select
                      required={clientMode === 'existing'}
                      value={selectedClientId}
                      onChange={e => handleClientSelect(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      <option value="">-- Choose Client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nameEn} (Passport: {c.passportNo || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Template / Agreement Format */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Agreement Template or Custom Clauses
                  </label>
                </div>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  <option value="blank">📝 Custom / Blank Agreement (Write Free-Text Clauses from Scratch)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      📜 {t.name} ({t.category})
                    </option>
                  ))}
                </select>

                {selectedTemplateId === 'blank' ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Agreement Title (English) *
                        </label>
                        <input
                          type="text"
                          required
                          value={customTitleEn}
                          onChange={e => setCustomTitleEn(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          عنوان الاتفاقية (العربية) *
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          required
                          value={customTitleAr}
                          onChange={e => setCustomTitleAr(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-arabic"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                        Contractual Clauses (Free-Text Editor)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAISuggesterOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/30 text-[#C9A05C] hover:text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                        title="Draft standard UAE-compliant clauses based on your service topic"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Suggest UAE-Compliant Terms</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Full Agreement Body / Clauses (English) *
                        </label>
                        <textarea
                          rows={6}
                          required
                          value={customBodyEn}
                          onChange={e => setCustomBodyEn(e.target.value)}
                          placeholder="Type out custom terms, numbered articles, conditions, scope of work, etc."
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-xs text-white font-mono leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 text-right">
                          نص وبنود الاتفاقية الكاملة (العربية) *
                        </label>
                        <textarea
                          rows={6}
                          dir="rtl"
                          required
                          value={customBodyAr}
                          onChange={e => setCustomBodyAr(e.target.value)}
                          placeholder="اكتب بنود الاتفاقية والشروط ونطاق العمل بالعربية..."
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-xs text-white font-arabic leading-loose"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Template Variables &amp; Placeholders</span>
                      <span className="text-[10px] text-slate-400 font-normal">Auto-mapped into document text</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Agreement Date</label>
                        <input
                          type="text"
                          value={formPlaceholders.date || ''}
                          onChange={e => setFormPlaceholders({ ...formPlaceholders, date: e.target.value })}
                          placeholder="e.g. 26 Sep 2026"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Client Name</label>
                        <input
                          type="text"
                          value={formPlaceholders.client_name || ''}
                          onChange={e => setFormPlaceholders({ ...formPlaceholders, client_name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Passport No.</label>
                        <input
                          type="text"
                          value={formPlaceholders.passport_no || ''}
                          onChange={e => setFormPlaceholders({ ...formPlaceholders, passport_no: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Emirates ID No.</label>
                        <input
                          type="text"
                          value={formPlaceholders.emirates_id || ''}
                          onChange={e => setFormPlaceholders({ ...formPlaceholders, emirates_id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Service Details</label>
                        <input
                          type="text"
                          value={formPlaceholders.service_details || ''}
                          onChange={e => setFormPlaceholders({ ...formPlaceholders, service_details: e.target.value })}
                          placeholder="e.g. Employment Visa Renewal, ICP Follow-up, and Emirates ID clearance"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-amber-300 mb-1">Agreed Amount (AED)</label>
                        <input
                          type="text"
                          value={formPlaceholders.amount || ''}
                          onChange={e => setFormPlaceholders({ ...formPlaceholders, amount: e.target.value })}
                          placeholder="e.g. 2,500.00"
                          className="w-full bg-slate-900 border border-amber-500/40 rounded px-2.5 py-1.5 text-xs text-amber-200 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Terms / Special Conditions Free-Text (Bilingual) */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Extra Terms / Special Clauses (Bilingual Free-Text)
                  </label>
                  <span className="text-[10px] text-slate-400">Appended directly to the final legal document</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Special Conditions &amp; Extra Terms (English)
                    </label>
                    <textarea
                      rows={3}
                      value={extraTermsEn}
                      onChange={e => setExtraTermsEn(e.target.value)}
                      placeholder="e.g. Client acknowledges that government fees are non-refundable once applied..."
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 text-right">
                      شروط وأحكام إضافية خاصة (العربية)
                    </label>
                    <textarea
                      rows={3}
                      dir="rtl"
                      value={extraTermsAr}
                      onChange={e => setExtraTermsAr(e.target.value)}
                      placeholder="مثال: يقر الطرف الثاني بأن الرسوم الحكومية غير قابلة للاسترداد بعد تقديم المعاملة..."
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white font-arabic"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {loading ? 'Drafting...' : 'Generate & Issue Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== TEMPLATE BUILDER MODAL ===================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#C9A05C]" />
                {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create Reusable Agreement Template'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Template Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={tmplName}
                    onChange={e => setTmplName(e.target.value)}
                    placeholder="e.g. Sponsorship Agreement"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-arabic" dir="rtl">
                    اسم النموذج بالعربية (Arabic Title) *
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={tmplNameAr}
                    onChange={e => setTmplNameAr(e.target.value)}
                    placeholder="مثال: اتفاقية كفالة وتخليص معاملات"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-arabic focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Service Category</label>
                <input
                  type="text"
                  value={tmplCategory}
                  onChange={e => setTmplCategory(e.target.value)}
                  placeholder="e.g. Visa Services / Typing / Licensing"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                Placeholders supported: <code>{`{{client_name}}`}</code>, <code>{`{{passport_no}}`}</code>, <code>{`{{emirates_id}}`}</code>, <code>{`{{service_details}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{date}}`}</code>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contract Body (English)</label>
                <textarea
                  rows={4}
                  required
                  value={tmplBodyEn}
                  onChange={e => setTmplBodyEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-arabic" dir="rtl">نص العقد (باللغة العربية)</label>
                <textarea
                  rows={4}
                  required
                  dir="rtl"
                  value={tmplBodyAr}
                  onChange={e => setTmplBodyAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-arabic leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI-Assisted Clause Suggester Modal */}
      <AIClauseSuggesterModal
        isOpen={isAISuggesterOpen}
        onClose={() => setIsAISuggesterOpen(false)}
        serviceTopic={customTitleEn || 'Administrative & Typing Services'}
        documentType="agreement"
        onInsertClause={(clauseEn, clauseAr, titleEn, titleAr) => {
          const headingEn = titleEn ? `\n\n${titleEn.toUpperCase()}:\n` : '\n\n';
          const headingAr = titleAr ? `\n\n${titleAr}:\n` : '\n\n';
          setCustomBodyEn(prev => (prev ? `${prev}${headingEn}${clauseEn}` : clauseEn));
          setCustomBodyAr(prev => (prev ? `${prev}${headingAr}${clauseAr}` : clauseAr));
        }}
        onInsertAllClauses={(allEn, allAr) => {
          setCustomBodyEn(prev => (prev ? `${prev}\n\n${allEn}` : allEn));
          setCustomBodyAr(prev => (prev ? `${prev}\n\n${allAr}` : allAr));
        }}
      />

      {/* Edit Agreement Modal */}
      {editingAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C9A05C]" />
                <h3 className="text-base font-bold text-white">
                  Edit Agreement: {editingAgreement.serialNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAgreement(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAgreement} className="p-5 space-y-4">
              {editAgrError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{editAgrError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Agreement Status
                </label>
                <select
                  value={editAgrStatus}
                  onChange={e => setEditAgrStatus(e.target.value as 'Valid' | 'Revoked' | 'Expired')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                >
                  <option value="Valid">Valid / Executed</option>
                  <option value="Revoked">Revoked</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Special English Terms / Clauses
                </label>
                <textarea
                  rows={3}
                  value={editExtraTermsEn}
                  onChange={e => setEditExtraTermsEn(e.target.value)}
                  placeholder="Special stipulations or custom conditions in English..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 text-right font-arabic">
                  الشروط والأحكام الإضافية (عربي)
                </label>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={editExtraTermsAr}
                  onChange={e => setEditExtraTermsAr(e.target.value)}
                  placeholder="أي شروط خاصة أو بنود إضافية باللغة العربية..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C] font-arabic"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAgreement(null)}
                  disabled={isEditAgrSaving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditAgrSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shadow disabled:opacity-50"
                >
                  {isEditAgrSaving ? (
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
        itemType="Agreement"
        itemName={deleteModalState.agreementTitle}
        warningMessage="Deleting this official agreement will permanently remove the contract record and QR verification from the system."
        currentUser={currentUser}
        onClose={() => setDeleteModalState({ isOpen: false, agreementId: '', agreementTitle: '' })}
        onConfirm={handleConfirmDeleteAgreement}
      />
    </div>
  );
};
