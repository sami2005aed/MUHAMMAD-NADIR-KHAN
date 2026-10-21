import React, { useState, useEffect } from 'react';
import { User, Employee, EmployeeStatus, EmployeeDocumentAttachment } from '../types.ts';
import { api } from '../services/api.ts';
import { formatAED, formatDate, getExpiryStatus } from '../utils/formatters.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { isMasterAdmin, logRoleDetection } from '../utils/auth.ts';
import {
  UserCheck,
  UserPlus,
  Search,
  Filter,
  AlertTriangle,
  Building2,
  Briefcase,
  FileText,
  Upload,
  Trash2,
  Edit2,
  Calendar,
  Phone,
  Globe,
  Coins,
  X,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpDown,
  FileCheck,
  Loader2,
} from 'lucide-react';

interface EmployeeManagementProps {
  currentUser: User;
  employees: Employee[];
  subAgents: User[];
  onRefreshEmployees: () => Promise<void> | void;
}

const VISA_TYPES = [
  'Employment',
  'Labour',
  'Investor',
  'Partner',
  'Golden Visa',
  'Green Visa',
  'Mission Visa',
  'Visit / Tourist',
  'Other',
];

const NATIONALITIES = [
  'India',
  'Pakistan',
  'Bangladesh',
  'Philippines',
  'Nepal',
  'Sri Lanka',
  'Egypt',
  'Syria',
  'Jordan',
  'Lebanon',
  'Sudan',
  'Morocco',
  'Burkina Faso',
  'Nigeria',
  'Kenya',
  'Ghana',
  'Uganda',
  'Ethiopia',
  'United Arab Emirates',
  'Other',
];

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  currentUser,
  employees,
  subAgents,
  onRefreshEmployees,
}) => {
  const isMaster = isMasterAdmin(currentUser);

  useEffect(() => {
    logRoleDetection('EmployeeManagement', currentUser);
  }, [currentUser]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EmployeeStatus>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'visa_expiring' | 'passport_expiring' | 'any_expired'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Form states
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [position, setPosition] = useState('');
  const [workingFor, setWorkingFor] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [salary, setSalary] = useState<number | string>(3000);
  const [passportNo, setPassportNo] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [visaNo, setVisaNo] = useState('');
  const [visaType, setVisaType] = useState('Employment');
  const [visaExpiry, setVisaExpiry] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('India');
  const [sourceAgentId, setSourceAgentId] = useState('office_direct');
  const [status, setStatus] = useState<EmployeeStatus>('Active');
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState<EmployeeDocumentAttachment[]>([]);

  // Document upload state
  const [docCategory, setDocCategory] = useState('Passport Copy');
  const [uploadingDocFile, setUploadingDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
  });

  const openAddModal = () => {
    setEditingEmployee(null);
    setNameEn('');
    setNameAr('');
    setPosition('');
    setWorkingFor('');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setSalary(3500);
    setPassportNo('');
    setPassportExpiry('');
    setVisaNo('');
    setVisaType('Employment');
    setVisaExpiry('');
    setPhone('');
    setNationality('India');
    setSourceAgentId('office_direct');
    setStatus('Active');
    setNotes('');
    setDocuments([]);
    setUploadingDocFile(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setNameEn(emp.nameEn || '');
    setNameAr(emp.nameAr || '');
    setPosition(emp.position || '');
    setWorkingFor(emp.workingFor || '');
    setJoinDate(emp.joinDate || '');
    setSalary(emp.salary || 0);
    setPassportNo(emp.passportNo || '');
    setPassportExpiry(emp.passportExpiry || '');
    setVisaNo(emp.visaNo || '');
    setVisaType(emp.visaType || 'Employment');
    setVisaExpiry(emp.visaExpiry || '');
    setPhone(emp.phone || '');
    setNationality(emp.nationality || 'India');
    setSourceAgentId(emp.sourceAgentId || 'office_direct');
    setStatus(emp.status || 'Active');
    setNotes(emp.notes || '');
    setDocuments(emp.documents || []);
    setUploadingDocFile(null);
    setFormError('');
    setIsModalOpen(true);
  };

  // Upload document
  const handleUploadDocument = async () => {
    if (!uploadingDocFile) {
      alert('Please select a document file to upload (PDF, JPG, PNG).');
      return;
    }

    setUploadingDoc(true);
    try {
      const uploaded = await api.uploadDocument(currentUser, uploadingDocFile, {
        notes: `${docCategory} - ${nameEn || 'Employee'}`,
      });

      const newAttachment: EmployeeDocumentAttachment = {
        id: uploaded.id || `emp-doc-${Date.now()}`,
        name: `${docCategory} (${uploadingDocFile.name})`,
        type: uploadingDocFile.type || 'application/pdf',
        url: uploaded.url,
        size: uploadingDocFile.size,
        uploadedAt: new Date().toISOString(),
      };

      setDocuments(prev => [...prev, newAttachment]);
      setUploadingDocFile(null);
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      setFormError('Employee Full Name (English) is required.');
      return;
    }
    if (!position.trim()) {
      setFormError('Job Title / Position is required.');
      return;
    }
    if (!workingFor.trim()) {
      setFormError('Company Name / Placed At is required.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      // Find source agent name
      let agentName = 'Office Direct';
      if (sourceAgentId !== 'office_direct') {
        const found = subAgents.find(a => a.id === sourceAgentId);
        if (found) agentName = found.companyName ? `${found.name} (${found.companyName})` : found.name;
      }

      const payload: Partial<Employee> = {
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim() || undefined,
        position: position.trim(),
        workingFor: workingFor.trim(),
        joinDate: joinDate || new Date().toISOString().split('T')[0],
        salary: Number(salary) || 0,
        passportNo: passportNo.trim(),
        passportExpiry,
        visaNo: visaNo.trim(),
        visaType,
        visaExpiry,
        phone: phone.trim(),
        nationality: nationality.trim(),
        sourceAgentId,
        sourceAgentName: agentName,
        status,
        notes: notes.trim() || undefined,
        documents,
      };

      if (editingEmployee) {
        await api.updateEmployee(currentUser, editingEmployee.id, payload);
      } else {
        await api.createEmployee(currentUser, payload);
      }

      await onRefreshEmployees();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save employee record');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Delete Modal
  const handleDeleteClick = (emp: Employee) => {
    setDeleteModalState({
      isOpen: true,
      employeeId: emp.id,
      employeeName: `${emp.nameEn} (${emp.position} at ${emp.workingFor})`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.employeeId) return;
    await api.deleteEmployee(currentUser, deleteModalState.employeeId);
    await onRefreshEmployees();
  };

  // Filters logic
  const filteredEmployees = employees.filter(emp => {
    const term = search.toLowerCase();
    const matchesSearch =
      emp.nameEn.toLowerCase().includes(term) ||
      (emp.nameAr && emp.nameAr.toLowerCase().includes(term)) ||
      emp.passportNo.toLowerCase().includes(term) ||
      emp.workingFor.toLowerCase().includes(term) ||
      emp.position.toLowerCase().includes(term) ||
      emp.phone.includes(term) ||
      emp.nationality.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesAgent = agentFilter === 'all' || emp.sourceAgentId === agentFilter;

    let matchesExpiry = true;
    if (expiryFilter === 'visa_expiring') {
      const vStat = getExpiryStatus(emp.visaExpiry);
      matchesExpiry = vStat.status === 'expiring_soon' || vStat.status === 'expired';
    } else if (expiryFilter === 'passport_expiring') {
      const pStat = getExpiryStatus(emp.passportExpiry);
      matchesExpiry = pStat.status === 'expiring_soon' || pStat.status === 'expired';
    } else if (expiryFilter === 'any_expired') {
      const vStat = getExpiryStatus(emp.visaExpiry);
      const pStat = getExpiryStatus(emp.passportExpiry);
      matchesExpiry = vStat.status === 'expired' || pStat.status === 'expired';
    }

    return matchesSearch && matchesStatus && matchesAgent && matchesExpiry;
  });

  // Summary Metrics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'Active');
  const visaExpiringSoon = activeEmployees.filter(e => {
    const s = getExpiryStatus(e.visaExpiry);
    return s.status === 'expiring_soon' || s.status === 'expired';
  });
  const passportExpiringSoon = activeEmployees.filter(e => {
    const s = getExpiryStatus(e.passportExpiry);
    return s.status === 'expiring_soon' || s.status === 'expired';
  });
  const totalPayroll = activeEmployees.reduce((sum, e) => sum + (e.salary || 0), 0);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'ID',
      'Name (English)',
      'Name (Arabic)',
      'Position',
      'Working For / Company',
      'Join Date',
      'Monthly Salary (AED)',
      'Passport Number',
      'Passport Expiry',
      'Visa Number',
      'Visa Type',
      'Visa Expiry',
      'Phone',
      'Nationality',
      'Source Agent',
      'Status',
      'Notes',
    ];

    const rows = filteredEmployees.map(e => [
      e.id,
      `"${e.nameEn}"`,
      `"${e.nameAr || ''}"`,
      `"${e.position}"`,
      `"${e.workingFor}"`,
      e.joinDate,
      e.salary,
      `"${e.passportNo}"`,
      e.passportExpiry,
      `"${e.visaNo}"`,
      `"${e.visaType}"`,
      e.visaExpiry,
      `"${e.phone}"`,
      `"${e.nationality}"`,
      `"${e.sourceAgentName || 'Office Direct'}"`,
      e.status,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CORE_LINK_Manpower_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-[#C9A05C]/20 to-amber-600/20 border border-[#C9A05C]/40 rounded-xl text-[#C9A05C]">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Manpower &amp; Employee Management
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                  Master Admin Exclusive
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized workforce database: placements, residency visas, passport tracking, and compliance records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Workforce Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Total Placed</span>
            <UsersIcon className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-white">{totalEmployees}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total recorded employees</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Active Workforce</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeEmployees.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently on active duty</div>
        </div>

        <div
          onClick={() => setExpiryFilter(expiryFilter === 'visa_expiring' ? 'all' : 'visa_expiring')}
          className={`bg-slate-900/90 border rounded-xl p-4 shadow-md cursor-pointer transition ${
            visaExpiringSoon.length > 0
              ? 'border-amber-500/40 hover:border-amber-500 bg-amber-950/10'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Visa Expiring ≤30d</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-black ${visaExpiringSoon.length > 0 ? 'text-amber-400' : 'text-white'}`}>
            {visaExpiringSoon.length}
          </div>
          <div className="text-[11px] text-amber-400/90 mt-1 font-medium">
            {visaExpiringSoon.length > 0 ? 'Action required for renewal' : 'All active visas valid'}
          </div>
        </div>

        <div
          onClick={() => setExpiryFilter(expiryFilter === 'passport_expiring' ? 'all' : 'passport_expiring')}
          className={`bg-slate-900/90 border rounded-xl p-4 shadow-md cursor-pointer transition ${
            passportExpiringSoon.length > 0
              ? 'border-rose-500/40 hover:border-rose-500 bg-rose-950/10'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Passport Expiring ≤30d</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-black ${passportExpiringSoon.length > 0 ? 'text-rose-400' : 'text-white'}`}>
            {passportExpiringSoon.length}
          </div>
          <div className="text-[11px] text-rose-400/90 mt-1 font-medium">
            {passportExpiringSoon.length > 0 ? 'Urgent renewal needed' : 'All passports valid'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
            <span>Monthly Payroll (Est.)</span>
            <Coins className="w-4 h-4 text-[#C9A05C]" />
          </div>
          <div className="text-xl font-black text-[#C9A05C]">{formatAED(totalPayroll)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Combined monthly salary</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-md">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, passport no, company, position, phone..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C]"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Terminated">Terminated</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          {/* Source Agent Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Source:</span>
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C]"
            >
              <option value="all">All Sources</option>
              <option value="office_direct">Office Direct</option>
              {subAgents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.companyName ? `${a.name} (${a.companyName})` : a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry Warning Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Expiry:</span>
            <select
              value={expiryFilter}
              onChange={e => setExpiryFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-[#C9A05C]"
            >
              <option value="all">All Expiries</option>
              <option value="visa_expiring">Visa Expiring ≤30d / Expired</option>
              <option value="passport_expiring">Passport Expiring ≤30d / Expired</option>
              <option value="any_expired">Any Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Employee Details</th>
                <th className="py-3 px-4">Position &amp; Working For</th>
                <th className="py-3 px-4">Join Date &amp; Salary</th>
                <th className="py-3 px-4">Passport &amp; Expiry</th>
                <th className="py-3 px-4">Visa &amp; Expiry</th>
                <th className="py-3 px-4">Source Agent</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Docs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEmployees.map(emp => {
                const passExp = getExpiryStatus(emp.passportExpiry);
                const visaExp = getExpiryStatus(emp.visaExpiry);

                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                    {/* Employee Details */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{emp.nameEn}</div>
                      {emp.nameAr && <div className="text-[11px] text-amber-200/90 font-arabic">{emp.nameAr}</div>}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-500" />
                          {emp.nationality}
                        </span>
                        {emp.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {emp.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Position & Placed At */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#C9A05C]" />
                        {emp.position}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span className="font-medium text-slate-300">{emp.workingFor}</span>
                      </div>
                    </td>

                    {/* Join Date & Salary */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#C9A05C]">{formatAED(emp.salary)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Joined: {formatDate(emp.joinDate)}</span>
                      </div>
                    </td>

                    {/* Passport Expiry (Color-coded) */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-slate-200">{emp.passportNo || 'N/A'}</div>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${passExp.badgeClass}`}
                        >
                          {passExp.status === 'expired' && <AlertTriangle className="w-3 h-3" />}
                          {passExp.status === 'expiring_soon' && <Clock className="w-3 h-3" />}
                          <span>{formatDate(emp.passportExpiry)}</span>
                          <span className="text-[9px] opacity-80">({passExp.label})</span>
                        </span>
                      </div>
                    </td>

                    {/* Visa Expiry (Color-coded) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-200">{emp.visaNo || 'N/A'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {emp.visaType}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${visaExp.badgeClass}`}
                        >
                          {visaExp.status === 'expired' && <AlertTriangle className="w-3 h-3" />}
                          {visaExp.status === 'expiring_soon' && <Clock className="w-3 h-3" />}
                          <span>{formatDate(emp.visaExpiry)}</span>
                          <span className="text-[9px] opacity-80">({visaExp.label})</span>
                        </span>
                      </div>
                    </td>

                    {/* Source Agent */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          emp.sourceAgentId === 'office_direct'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {emp.sourceAgentName || (emp.sourceAgentId === 'office_direct' ? 'Office Direct' : 'Sub-Agent')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          emp.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : emp.status === 'On Leave'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>

                    {/* Documents */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setViewingEmployee(emp)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition cursor-pointer"
                        title="View employee documents"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C9A05C]" />
                        <span>{emp.documents?.length || 0}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-lg transition cursor-pointer"
                          title="Edit Employee Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteClick(emp)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 rounded-lg transition cursor-pointer"
                          title="Delete Employee Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                    <p className="text-sm font-semibold">No employee records found.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {search || statusFilter !== 'all' || agentFilter !== 'all' || expiryFilter !== 'all'
                        ? 'Try clearing your filters or search term.'
                        : 'Click "Add New Employee" to register your first workforce placement.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ADD / EDIT EMPLOYEE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl my-8 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#C9A05C]/15 border border-[#C9A05C]/30 rounded-xl text-[#C9A05C]">
                  {editingEmployee ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingEmployee ? 'Edit Employee Record' : 'Register New Employee / Manpower'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter placement details, visa &amp; passport validity, compensation, and documents.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Basic & Contact Info */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#C9A05C] border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Personal &amp; Contact Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name (English) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nameEn}
                      onChange={e => setNameEn(e.target.value)}
                      placeholder="e.g. Rajesh Kumar Sharma"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name (Arabic - Optional)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={nameAr}
                      onChange={e => setNameAr(e.target.value)}
                      placeholder="راجيش كومار شارما"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C] font-arabic"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nationality</label>
                    <select
                      value={nationality}
                      onChange={e => setNationality(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      {NATIONALITIES.map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone / Mobile</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 054 332 2119"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Position, Placement & Salary */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#C9A05C] border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>Employment &amp; Placement</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Position / Job Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                      placeholder="e.g. Heavy Equipment Operator / Typing Clerk"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Placed At / Working For (Company) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={workingFor}
                      onChange={e => setWorkingFor(e.target.value)}
                      placeholder="e.g. Al Futtaim Engineering LLC"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Join Date</label>
                    <input
                      type="date"
                      value={joinDate}
                      onChange={e => setJoinDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Salary (AED)</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                      placeholder="e.g. 4500"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Source Agent</label>
                    <select
                      value={sourceAgentId}
                      onChange={e => setSourceAgentId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      <option value="office_direct">Office Direct (No Sub-Agent)</option>
                      {subAgents.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.companyName ? `${a.name} (${a.companyName})` : a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Employment Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as EmployeeStatus)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Passport & Visa Compliance */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#C9A05C] border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  <span>Passport &amp; Residence Visa Compliance</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Passport Number</label>
                    <input
                      type="text"
                      value={passportNo}
                      onChange={e => setPassportNo(e.target.value)}
                      placeholder="e.g. M8291048"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Passport Expiry Date</label>
                    <input
                      type="date"
                      value={passportExpiry}
                      onChange={e => setPassportExpiry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Visa Number / Unified No</label>
                    <input
                      type="text"
                      value={visaNo}
                      onChange={e => setVisaNo(e.target.value)}
                      placeholder="e.g. 201/2025/78491"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Visa Type</label>
                    <select
                      value={visaType}
                      onChange={e => setVisaType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    >
                      {VISA_TYPES.map(vt => (
                        <option key={vt} value={vt}>
                          {vt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Visa Expiry Date</label>
                    <input
                      type="date"
                      value={visaExpiry}
                      onChange={e => setVisaExpiry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Medical fitness, biometrics status, labor contract specifics, etc."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                />
              </div>

              {/* Section 5: Documents Upload */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#C9A05C] border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Attached Documents ({documents.length})</span>
                  </span>
                </h4>

                {/* Upload box */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">Document Category</label>
                      <select
                        value={docCategory}
                        onChange={e => setDocCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                      >
                        <option value="Passport Copy">Passport Copy</option>
                        <option value="Visa Copy">Visa Copy</option>
                        <option value="Labour Card">Labour Card</option>
                        <option value="Emirates ID">Emirates ID</option>
                        <option value="MOHRE Contract">MOHRE Contract</option>
                        <option value="Medical Certificate">Medical Certificate</option>
                        <option value="Other">Other Document</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">Select File (PDF, JPG, PNG)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              setUploadingDocFile(e.target.files[0]);
                            }
                          }}
                          className="flex-1 text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={handleUploadDocument}
                          disabled={!uploadingDocFile || uploadingDoc}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          {uploadingDoc ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Attach</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Documents List */}
                  {documents.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      {documents.map((doc, idx) => (
                        <div
                          key={doc.id || idx}
                          className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck className="w-4 h-4 text-[#C9A05C] shrink-0" />
                            <span className="font-semibold text-slate-200 truncate">{doc.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({formatDate(doc.uploadedAt)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {doc.url && doc.url !== '#' && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-white"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(doc.id)}
                              className="p-1 text-rose-400 hover:text-rose-200"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Record...</span>
                    </>
                  ) : (
                    <span>{editingEmployee ? 'Update Record' : 'Save Employee'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW EMPLOYEE DETAILS MODAL ================= */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#C9A05C]/15 border border-[#C9A05C]/30 rounded-xl text-[#C9A05C]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{viewingEmployee.nameEn}</h3>
                  {viewingEmployee.nameAr && (
                    <p className="text-xs text-amber-200/90 font-arabic">{viewingEmployee.nameAr}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Status and Salary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Status</span>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      viewingEmployee.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : viewingEmployee.status === 'On Leave'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {viewingEmployee.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Monthly Salary</span>
                  <span className="text-base font-black text-[#C9A05C]">{formatAED(viewingEmployee.salary)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Source Agent</span>
                  <span className="font-semibold text-slate-200">{viewingEmployee.sourceAgentName || 'Office Direct'}</span>
                </div>
              </div>

              {/* Grid of Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Position</span>
                  <span className="text-sm font-semibold text-white mt-1 block">{viewingEmployee.position}</span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Placed At (Company)</span>
                  <span className="text-sm font-semibold text-amber-300 mt-1 block">{viewingEmployee.workingFor}</span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Nationality</span>
                  <span className="text-xs font-medium text-slate-200 mt-1 block">{viewingEmployee.nationality}</span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Phone</span>
                  <span className="text-xs font-mono text-slate-200 mt-1 block">{viewingEmployee.phone || 'N/A'}</span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Passport Details</span>
                  <span className="text-xs font-mono text-white mt-1 block">{viewingEmployee.passportNo || 'N/A'}</span>
                  <div className="mt-1">
                    {(() => {
                      const s = getExpiryStatus(viewingEmployee.passportExpiry);
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${s.badgeClass}`}>
                          Expires: {formatDate(viewingEmployee.passportExpiry)} ({s.label})
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Visa Details</span>
                  <span className="text-xs font-mono text-white mt-1 block">
                    {viewingEmployee.visaNo || 'N/A'} ({viewingEmployee.visaType})
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const s = getExpiryStatus(viewingEmployee.visaExpiry);
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${s.badgeClass}`}>
                          Expires: {formatDate(viewingEmployee.visaExpiry)} ({s.label})
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {viewingEmployee.notes && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Administrative Notes</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{viewingEmployee.notes}</p>
                </div>
              )}

              {/* Documents */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-2">
                  Uploaded Documents ({viewingEmployee.documents?.length || 0})
                </span>
                {viewingEmployee.documents && viewingEmployee.documents.length > 0 ? (
                  <div className="space-y-2">
                    {viewingEmployee.documents.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-[#C9A05C]" />
                          <span className="font-semibold text-slate-200">{doc.name}</span>
                        </div>
                        {doc.url && doc.url !== '#' && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 bg-slate-950/50 border border-slate-800/80 rounded-xl">
                    No documents uploaded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewingEmployee(null);
                  openEditModal(viewingEmployee);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Record</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PASSWORD-PROTECTED CONFIRM DELETION MODAL ================= */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        itemType="Employee Placement Record"
        itemName={deleteModalState.employeeName}
        warningMessage="Deleting this employee record will permanently remove their employment history, salary terms, visa validity dates, and attached document records from the database."
        currentUser={currentUser}
        onClose={() =>
          setDeleteModalState({
            isOpen: false,
            employeeId: '',
            employeeName: '',
          })
        }
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

// Helper icon component
const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
