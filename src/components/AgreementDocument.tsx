import React from 'react';
import { Agreement, CompanySettings } from '../types.ts';
import { formatDate } from '../utils/formatters.ts';
import { OfficialLetterhead, OfficialFooter } from './OfficialLetterhead.tsx';

interface AgreementDocumentProps {
  agreement: Agreement;
  settings: CompanySettings;
  qrCodeUrl?: string;
  className?: string;
}

export const AgreementDocument: React.FC<AgreementDocumentProps> = ({
  agreement,
  settings,
  qrCodeUrl,
  className = '',
}) => {
  return (
    <div
      className={`bg-white text-slate-900 font-sans p-6 sm:p-8 select-text ${className}`}
      style={{ width: '100%', maxWidth: '794px', margin: '0 auto', boxSizing: 'border-box' }}
    >
      {/* Official UAE Bilingual Letterhead */}
      <div data-pdf-block="true">
        <OfficialLetterhead
          settings={settings}
          documentTitleEn={agreement.templateName}
          documentTitleAr="عقد ووثيقة تقديم خدمات إدارية"
          serialNumber={agreement.serialNo}
          issueDate={formatDate(agreement.createdAt)}
          qrCodeUrl={qrCodeUrl}
        />
      </div>

      {/* Contracting Parties Identification Box */}
      <div
        data-pdf-block="true"
        className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 mb-5 bg-slate-50/70 text-xs pdf-avoid-break"
      >
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            First Party (Service Provider) / الطرف الأول
          </span>
          <div className="font-extrabold text-[#0A1A3C] text-sm">{settings.tradeNameEn}</div>
          <div className="text-slate-600 mt-0.5">Trade License: {settings.licenseNo} &bull; Ajman, UAE</div>
          <div className="text-slate-600">Tel: {settings.phones[0]} &bull; {settings.emails[0]}</div>
        </div>

        <div className="text-right font-arabic" dir="rtl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            الطرف الثاني (العميل) / Second Party
          </span>
          <div className="font-extrabold text-[#0A1A3C] text-sm">
            {agreement.clientNameAr || agreement.clientNameEn}
          </div>
          <div className="text-slate-600 mt-0.5">
            جواز سفر: <strong className="font-mono text-slate-900">{agreement.clientPassport || 'N/A'}</strong> &bull; هوية:{' '}
            <strong className="font-mono text-slate-900">{agreement.clientEmiratesId || 'N/A'}</strong>
          </div>
          <div className="text-slate-600 font-mono" dir="ltr">
            {agreement.clientNameEn}
          </div>
        </div>
      </div>

      {/* Bilingual Parallel Clauses Side-by-Side */}
      <div
        data-pdf-block="true"
        className="grid grid-cols-2 gap-5 my-5 text-xs leading-relaxed pdf-avoid-break clause-box"
      >
        {/* English Column (Left) */}
        <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2 shadow-2xs">
          <h4 className="font-bold text-xs text-[#0A1A3C] uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            Contractual Terms &amp; Provisions (English)
          </h4>
          <div className="whitespace-pre-line text-slate-800 leading-relaxed text-[11.5px]">
            {agreement.renderedBodyEn}
          </div>
        </div>

        {/* Arabic Column (Right - RTL) */}
        <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2 font-arabic shadow-2xs" dir="rtl" lang="ar">
          <h4 className="font-bold text-xs text-[#0A1A3C] border-b border-slate-200 pb-1 mb-2">
            بنود وشروط الاتفاقية (العربية)
          </h4>
          <div className="whitespace-pre-line text-slate-800 text-right leading-loose text-[11.5px] font-arabic">
            {agreement.renderedBodyAr}
          </div>
        </div>
      </div>

      {/* Legal Signatures & Official Stamp */}
      <div
        data-pdf-block="true"
        className="mt-6 pt-4 border-t-2 border-slate-200 grid grid-cols-3 gap-4 text-center text-xs pdf-avoid-break signatures-box"
      >
        <div>
          <span className="font-bold text-slate-700 block mb-7">Second Party Signature (Client)</span>
          <div className="border-t border-slate-400 mx-4 pt-1 text-[10px] text-slate-600 font-semibold">
            {agreement.clientNameEn}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="w-24 h-16 border-2 border-dashed border-amber-600/40 rounded flex items-center justify-center text-[10px] text-amber-800 font-bold uppercase bg-amber-50/20">
            Official Stamp
          </div>
          <span className="text-[9px] text-slate-500 mt-1 font-semibold">CORE LINK Ajman</span>
        </div>

        <div>
          <span className="font-bold text-slate-700 block mb-7">Authorized Signatory (CORE LINK)</span>
          <div className="border-t border-slate-400 mx-4 pt-1 text-[10px] text-slate-600 font-semibold">
            Mohammed Al Nuaimi (Master Admin)
          </div>
        </div>
      </div>

      {/* Official UAE Bottom Footer Strip */}
      <div data-pdf-block="true">
        <OfficialFooter settings={settings} />
      </div>
    </div>
  );
};
