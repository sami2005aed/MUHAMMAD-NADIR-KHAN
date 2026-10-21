import React from 'react';
import { CompanySettings } from '../types.ts';
import { formatAED } from '../utils/formatters.ts';
import { OfficialLetterhead, OfficialFooter } from './OfficialLetterhead.tsx';

interface ReportDocumentProps {
  settings: CompanySettings;
  reportPeriodLabel: string;
  serialNumber: string;
  issueDate: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  completedJobsCount: number;
  serviceBreakdown: Record<string, { count: number; revenue: number }>;
  className?: string;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({
  settings,
  reportPeriodLabel,
  serialNumber,
  issueDate,
  totalRevenue,
  totalExpenses,
  netProfit,
  completedJobsCount,
  serviceBreakdown,
  className = '',
}) => {
  return (
    <div
      className={`bg-white text-slate-900 font-sans p-6 sm:p-8 select-text ${className}`}
      style={{ width: '100%', maxWidth: '794px', margin: '0 auto', boxSizing: 'border-box' }}
    >
      {/* Official Bilingual Header */}
      <div data-pdf-block="true">
        <OfficialLetterhead
          settings={settings}
          documentTitleEn="EXECUTIVE BUSINESS REPORT"
          documentTitleAr="تقرير الأعمال والإيرادات الإدارية"
          serialNumber={serialNumber}
          issueDate={issueDate}
        />
      </div>

      {/* Report Scope Sub-banner */}
      <div
        data-pdf-block="true"
        className="bg-slate-100 border border-slate-300 rounded-lg p-3 mb-5 flex justify-between items-center text-xs pdf-avoid-break"
      >
        <div>
          <span className="font-bold text-slate-600 block text-[10px] uppercase tracking-wider">
            Reporting Scope / الفترة المحاسبية:
          </span>
          <span className="text-sm font-extrabold text-[#0A1A3C]">{reportPeriodLabel}</span>
        </div>
        <div className="text-right">
          <span className="font-semibold text-slate-500 text-[10px] uppercase block">Prepared By:</span>
          <span className="font-bold text-slate-800">Master Admin Console</span>
        </div>
      </div>

      {/* Executive Summary Metrics Grid */}
      <div data-pdf-block="true" className="grid grid-cols-4 gap-3 mb-5 pdf-avoid-break">
        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Revenue</span>
          <div className="text-base font-black text-emerald-700">{formatAED(totalRevenue)}</div>
          <span className="text-[9px] text-slate-500">Income received</span>
        </div>

        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Expenses</span>
          <div className="text-base font-black text-rose-700">{formatAED(totalExpenses)}</div>
          <span className="text-[9px] text-slate-500">Operating costs</span>
        </div>

        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Net Profit / Loss</span>
          <div className={`text-base font-black ${netProfit >= 0 ? 'text-[#0A1A3C]' : 'text-rose-700'}`}>
            {formatAED(netProfit)}
          </div>
          <span className="text-[9px] text-slate-500">Operational margin</span>
        </div>

        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Completed Jobs</span>
          <div className="text-base font-black text-blue-900">{completedJobsCount}</div>
          <span className="text-[9px] text-slate-500">Applications cleared</span>
        </div>
      </div>

      {/* Service Performance Breakdown Table */}
      <div data-pdf-block="true" className="mb-5 pdf-avoid-break">
        <h4 className="text-xs font-bold text-[#0A1A3C] uppercase tracking-wider mb-2">
          Service Performance &amp; Revenue Breakdown
        </h4>
        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0A1A3C] text-white text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2.5 px-3">Service Category</th>
                <th className="py-2.5 px-3 text-center w-28">Volume / Count</th>
                <th className="py-2.5 px-3 text-right w-36">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Object.keys(serviceBreakdown).length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400 italic">
                    No transactions recorded for the selected reporting period.
                  </td>
                </tr>
              ) : (
                Object.entries(serviceBreakdown).map(([category, data]) => (
                  <tr key={category} className="odd:bg-white even:bg-slate-50/60">
                    <td className="py-2 px-3 font-semibold text-slate-800">{category}</td>
                    <td className="py-2 px-3 text-center text-slate-600 font-mono">{data.count}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0A1A3C]">
                      {formatAED(data.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Sign-off & Audit Notice */}
      <div
        data-pdf-block="true"
        className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-6 text-xs pdf-avoid-break signatures-box"
      >
        <div>
          <span className="font-bold text-slate-700 block mb-1">Executive Certification &bull; اعتماد التقرير</span>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            This periodic financial and operational summary has been computed from the internal ledger of CORE LINK
            Administrative Services (Trade License #140290, Ajman).
          </p>
          <div className="mt-7 border-t border-slate-400 pt-1 text-[10px] text-slate-600 font-semibold">
            Certified by Master Administration
          </div>
        </div>

        <div className="text-right">
          <span className="font-bold text-slate-700 block mb-1 font-arabic" dir="rtl">
            مدير المنشأة / الإدارة العامة
          </span>
          <p className="text-[10px] text-slate-500 font-arabic leading-relaxed" dir="rtl">
            تم اعتماد التقرير الدوري رسمياً من قبل كور لينك للخدمات الإدارية.
          </p>
          <div className="mt-7 border-t border-slate-400 pt-1 text-[10px] text-slate-600 font-semibold text-right font-arabic" dir="rtl">
            الختم الرسمي والاعتماد &bull; Master Admin Seal
          </div>
        </div>
      </div>

      {/* Official Bottom Footer */}
      <div data-pdf-block="true">
        <OfficialFooter settings={settings} />
      </div>
    </div>
  );
};
