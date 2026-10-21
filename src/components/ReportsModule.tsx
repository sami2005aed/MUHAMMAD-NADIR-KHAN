import React, { useState, useRef } from 'react';
import {
  User,
  Transaction,
  Job,
  Client,
  CompanySettings,
} from '../types.ts';
import { api } from '../services/api.ts';
import { formatAED, formatDate } from '../utils/formatters.ts';
import { exportElementToPdf } from '../services/clientPdfService.ts';
import { OfficialLetterhead, OfficialFooter } from './OfficialLetterhead.tsx';
import {
  BarChart3,
  Calendar,
  Printer,
  Download,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  Users,
} from 'lucide-react';

interface ReportsModuleProps {
  currentUser: User;
  transactions: Transaction[];
  jobs: Job[];
  clients: Client[];
  subAgents: User[];
  settings: CompanySettings;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  currentUser,
  transactions = [],
  jobs = [],
  clients = [],
  subAgents = [],
  settings,
}) => {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeSubAgents = Array.isArray(subAgents) ? subAgents : [];

  const [reportType, setReportType] = useState<'monthly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const reportDocRef = useRef<HTMLDivElement>(null);

  // Filter transactions based on date
  const filteredTransactions = safeTransactions.filter(t => {
    if (reportType === 'monthly') {
      return t.date.startsWith(selectedMonth);
    }
    return t.date >= startDate && t.date <= endDate;
  });

  // Filter jobs based on date
  const filteredJobs = safeJobs.filter(j => {
    const jobDate = j.createdAt.split('T')[0];
    if (reportType === 'monthly') {
      return jobDate.startsWith(selectedMonth);
    }
    return jobDate >= startDate && jobDate <= endDate;
  });

  // Filter clients registered in period
  const filteredClients = safeClients.filter(c => {
    const cDate = c.createdAt.split('T')[0];
    if (reportType === 'monthly') {
      return cDate.startsWith(selectedMonth);
    }
    return cDate >= startDate && cDate <= endDate;
  });

  const totalRevenue = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;
  const completedJobsCount = filteredJobs.filter(
    j => j.status === 'Completed' || j.status === 'Delivered'
  ).length;

  // Sub-agent commissions summary
  const agentCommissions: Record<string, { name: string; count: number; commission: number }> = {};
  filteredJobs.forEach(j => {
    if (j.agentId) {
      if (!agentCommissions[j.agentId]) {
        agentCommissions[j.agentId] = {
          name: j.agentName || 'Sub-Agent',
          count: 0,
          commission: 0,
        };
      }
      agentCommissions[j.agentId].count += 1;
      agentCommissions[j.agentId].commission += j.commissionAmount || 0;
    }
  });

  // Service breakdown
  const serviceDistribution: Record<string, number> = {};
  filteredJobs.forEach(j => {
    serviceDistribution[j.type] = (serviceDistribution[j.type] || 0) + 1;
  });

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!reportDocRef.current) return;
    try {
      setDownloadingPdf(true);
      const filename = `CoreLink-Report-${reportType}-${selectedMonth || startDate}.pdf`;
      await exportElementToPdf(reportDocRef.current, filename, {
        documentTitle: 'EXECUTIVE BUSINESS REPORT',
        serialNumber: `CL-REP-${new Date().getFullYear()}`,
        tradeName: settings.tradeNameEn,
      });
    } catch (err: any) {
      console.error('Report PDF generation error:', err);
      alert(err.message || 'Failed to download report PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount (AED)', 'Method', 'Notes'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.type.toUpperCase(),
      `"${t.category}"`,
      t.amount.toFixed(2),
      t.method,
      `"${t.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `corelink-financial-report-${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportPeriodLabel =
    reportType === 'monthly'
      ? `Month: ${selectedMonth}`
      : `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`;

  return (
    <div className="space-y-6">
      {/* Controls Bar (no-print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#C9A05C]" />
            Official Reports &amp; Financial Statements
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Auto-generate comprehensive executive reports with official UAE bilingual letterhead, charts, and audit metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A05C]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            disabled={downloadingPdf}
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Box (no-print) */}
      <div className="no-print bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setReportType('monthly')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              reportType === 'monthly'
                ? 'bg-[#C9A05C] text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Report
          </button>
          <button
            onClick={() => setReportType('custom')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              reportType === 'custom'
                ? 'bg-[#C9A05C] text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Date Range
          </button>
        </div>

        {reportType === 'monthly' ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Select Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
            />
          </div>
        )}
      </div>

      {/* Printable Report Document Card */}
      <div
        ref={reportDocRef}
        style={{ width: '100%', maxWidth: '794px', margin: '0 auto', boxSizing: 'border-box' }}
        className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200 print-page"
      >
        {/* Official Bilingual Header */}
        <OfficialLetterhead
          settings={settings}
          documentTitleEn="EXECUTIVE BUSINESS REPORT"
          documentTitleAr="تقرير الأعمال والإيرادات الإدارية"
          serialNumber={`CL-REP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`}
          issueDate={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        />

        {/* Report Scope Sub-banner */}
        <div className="bg-slate-100 border border-slate-300 rounded p-3 mb-6 flex justify-between items-center text-xs">
          <div>
            <span className="font-bold text-slate-600 block">Reporting Scope / الفترة المحاسبية:</span>
            <span className="text-sm font-extrabold text-[#0A1A3C]">{reportPeriodLabel}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-500">Prepared By:</span>
            <span className="block font-bold text-slate-800">Master Admin Console</span>
          </div>
        </div>

        {/* Executive Summary Metrics Grid */}
        <div data-pdf-block="true" className="grid grid-cols-4 gap-3 mb-6 pdf-avoid-break">
          <div className="border border-slate-300 rounded p-3 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Revenue</span>
            <div className="text-lg font-black text-emerald-700">{formatAED(totalRevenue)}</div>
            <span className="text-[9px] text-slate-500">Income received</span>
          </div>

          <div className="border border-slate-300 rounded p-3 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Expenses</span>
            <div className="text-lg font-black text-rose-700">{formatAED(totalExpenses)}</div>
            <span className="text-[9px] text-slate-500">Operating costs</span>
          </div>

          <div className="border border-slate-300 rounded p-3 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Net Profit / Loss</span>
            <div className="text-lg font-black text-amber-800">{formatAED(netProfit)}</div>
            <span className="text-[9px] text-slate-500">Auto calculated</span>
          </div>

          <div className="border border-slate-300 rounded p-3 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Jobs Executed</span>
            <div className="text-lg font-black text-slate-900">{completedJobsCount} / {filteredJobs.length}</div>
            <span className="text-[9px] text-slate-500">Completed / Total</span>
          </div>
        </div>

        {/* Sub-Agent Commission Summary Table */}
        <div data-pdf-block="true" className="mb-6 pdf-avoid-break">
          <h4 className="font-extrabold text-xs text-[#0A1A3C] uppercase tracking-wider mb-2 flex items-center justify-between border-b pb-1">
            <span>Sub-Agent Commission Payouts Summary</span>
            <span className="font-arabic text-amber-800 font-normal">ملخص عمولات الوكلاء الفرعيين</span>
          </h4>

          {Object.keys(agentCommissions).length > 0 ? (
            <table className="w-full text-left text-xs border border-slate-300 rounded overflow-hidden">
              <thead className="bg-[#0A1A3C] text-white text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Sub-Agent Name</th>
                  <th className="py-2 px-3 text-center">Jobs Assigned</th>
                  <th className="py-2 px-3 text-right">Total Commission (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.entries(agentCommissions).map(([agentId, data]) => (
                  <tr key={agentId} className="odd:bg-white even:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{data.name}</td>
                    <td className="py-2 px-3 text-center text-slate-700">{data.count}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatAED(data.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 border border-slate-200 rounded">
              No sub-agent commissions assigned during this period.
            </div>
          )}
        </div>

        {/* Activity & Service Breakdown */}
        <div data-pdf-block="true" className="mb-6 pdf-avoid-break">
          <h4 className="font-extrabold text-xs text-[#0A1A3C] uppercase tracking-wider mb-2 flex items-center justify-between border-b pb-1">
            <span>Activity Breakdown by Service Type</span>
            <span className="font-arabic text-amber-800 font-normal">توزيع المعاملات حسب نوع الخدمة</span>
          </h4>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {Object.entries(serviceDistribution).map(([type, count], idx) => (
              <div key={idx} className="p-2 border border-slate-200 rounded bg-slate-50 flex justify-between">
                <span className="text-slate-700 truncate pr-1">{type}</span>
                <span className="font-bold text-[#0A1A3C]">{count}</span>
              </div>
            ))}
            {Object.keys(serviceDistribution).length === 0 && (
              <div className="col-span-3 text-center py-2 text-slate-500 text-xs">
                No services recorded in selected range.
              </div>
            )}
          </div>
        </div>

        {/* Official Signatures */}
        <div data-pdf-block="true" className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-xs pdf-avoid-break signatures-box">
          <div>
            <span className="font-bold text-slate-700 block mb-1">Financial Controller / تدقيق الحسابات</span>
            <p className="text-[10px] text-slate-500">I hereby verify that all revenue and voucher transactions reflect official books.</p>
            <div className="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-semibold">
              Authorized Signature
            </div>
          </div>

          <div className="text-right">
            <span className="font-bold text-slate-700 block mb-1 font-arabic" dir="rtl">مدير المنشأة / الإدارة العامة</span>
            <p className="text-[10px] text-slate-500 font-arabic" dir="rtl">تم اعتماد التقرير الدوري رسمياً من قبل كور لينك للخدمات الإدارية.</p>
            <div className="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-semibold text-right">
              Master Admin Seal &amp; Approval
            </div>
          </div>
        </div>

        <OfficialFooter settings={settings} />
      </div>
    </div>
  );
};
