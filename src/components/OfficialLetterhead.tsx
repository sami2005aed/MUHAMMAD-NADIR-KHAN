import React from 'react';
import { CompanySettings } from '../types.ts';
import { CompanyLogo } from './CompanyLogo.tsx';

interface OfficialLetterheadProps {
  settings: CompanySettings;
  documentTitleEn: string;
  documentTitleAr: string;
  serialNumber?: string;
  issueDate?: string;
  qrCodeUrl?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({
  settings,
  documentTitleEn,
  documentTitleAr,
  serialNumber,
  issueDate,
  qrCodeUrl,
}) => {
  return (
    <div
      className="w-full text-slate-900 border-b-2 border-[#0A1A3C] pb-4 mb-6"
      style={{ width: '100%', boxSizing: 'border-box' }}
    >
      {/* UAE Official Top Banner Strip */}
      <div
        className="flex justify-between items-center bg-[#0A1A3C] text-white px-4 py-1.5 rounded-t text-xs font-semibold uppercase tracking-wider mb-3"
        style={{
          backgroundColor: '#0A1A3C',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 14px',
          borderRadius: '4px 4px 0 0',
          marginBottom: '12px',
        }}
      >
        <span>United Arab Emirates &bull; Government of Ajman</span>
        <span className="font-arabic font-normal text-amber-200" style={{ fontFamily: "'Cairo', sans-serif", color: '#fef08a' }}>
          دولة الإمارات العربية المتحدة &bull; حكومة عجمان
        </span>
      </div>

      {/* Main Letterhead Body */}
      <div
        className="flex flex-row items-center justify-between gap-4 px-2"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '0 8px',
        }}
      >
        {/* Left Side: English Info */}
        <div className="text-left flex-1 min-w-[200px]" style={{ flex: 1, minWidth: '200px', textAlign: 'left' }}>
          <h1 className="text-xl font-extrabold text-[#0A1A3C] tracking-tight" style={{ fontSize: '18px', fontWeight: 800, color: '#0A1A3C', margin: 0 }}>
            {settings.tradeNameEn}
          </h1>
          <p className="text-xs text-[#C9A05C] font-bold tracking-wider uppercase" style={{ fontSize: '11px', fontWeight: 700, color: '#C9A05C', margin: '2px 0 6px 0' }}>
            {settings.tagline}
          </p>
          <div className="text-[11px] text-slate-700 mt-1 leading-snug" style={{ fontSize: '10px', color: '#334155', lineHeight: 1.4 }}>
            <div><span className="font-semibold text-slate-900" style={{ fontWeight: 600, color: '#0f172a' }}>Trade License:</span> {settings.licenseNo}</div>
            <div><span className="font-semibold text-slate-900" style={{ fontWeight: 600, color: '#0f172a' }}>Legal Form:</span> {settings.legalForm}</div>
            <div><span className="font-semibold text-slate-900" style={{ fontWeight: 600, color: '#0f172a' }}>Address:</span> {settings.address}</div>
            <div><span className="font-semibold text-slate-900" style={{ fontWeight: 600, color: '#0f172a' }}>Tel:</span> {settings.phones.join(' / ')}</div>
            <div><span className="font-semibold text-slate-900" style={{ fontWeight: 600, color: '#0f172a' }}>Email:</span> {settings.emails[0]}</div>
            {settings.trn && settings.chargeVat ? (
              <div className="text-emerald-700 font-bold" style={{ color: '#047857', fontWeight: 700 }}><span>TRN:</span> {settings.trn}</div>
            ) : (
              <div className="text-slate-500 font-semibold" style={{ color: '#64748b' }}><span>TRN:</span> Not Registered</div>
            )}
          </div>
        </div>

        {/* Center: Official Real Logo Artwork & QR Code if available */}
        <div className="flex flex-col items-center justify-center shrink-0 px-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '0 8px' }}>
          <CompanyLogo size="letterhead" />
          {qrCodeUrl && (
            <div className="mt-2 text-center" style={{ marginTop: '6px', textAlign: 'center' }}>
              <img
                src={qrCodeUrl}
                alt="Document QR Verification"
                style={{
                  width: '64px',
                  height: '64px',
                  maxWidth: '64px',
                  maxHeight: '64px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '2px',
                }}
                className="w-16 h-16 border border-slate-300 p-0.5 rounded shadow-xs mx-auto"
              />
              <span className="text-[9px] text-slate-500 font-mono block mt-0.5" style={{ fontSize: '8px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                SCAN TO VERIFY
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Arabic Info (RTL) */}
        <div className="text-right flex-1 min-w-[200px] font-arabic" dir="rtl" lang="ar" style={{ flex: 1, minWidth: '200px', textAlign: 'right', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
          <h1 className="text-xl font-extrabold text-[#0A1A3C]" style={{ fontSize: '18px', fontWeight: 800, color: '#0A1A3C', margin: 0 }}>
            {settings.tradeNameAr}
          </h1>
          <p className="text-xs text-[#9B7330] font-bold tracking-wide" style={{ fontSize: '11px', fontWeight: 700, color: '#9B7330', margin: '2px 0 6px 0' }}>
            خدمات التأشيرات | الطباعة | الرخص التجارية | التذاكر
          </p>
          <div className="text-[11px] text-slate-700 mt-1 leading-snug" style={{ fontSize: '10px', color: '#334155', lineHeight: 1.4 }}>
            <div><span className="font-bold text-slate-900" style={{ fontWeight: 700, color: '#0f172a' }}>رقم الرخصة:</span> {settings.licenseNo}</div>
            <div><span className="font-bold text-slate-900" style={{ fontWeight: 700, color: '#0f172a' }}>الشكل القانوني:</span> مؤسسة فردية</div>
            <div><span className="font-bold text-slate-900" style={{ fontWeight: 700, color: '#0f172a' }}>العنوان:</span> {settings.addressAr}</div>
            <div><span className="font-bold text-slate-900" style={{ fontWeight: 700, color: '#0f172a' }}>الهاتف:</span> {settings.phones.join(' / ')}</div>
            <div><span className="font-bold text-slate-900" style={{ fontWeight: 700, color: '#0f172a' }}>البريد:</span> {settings.emails[0]}</div>
            {settings.trn && settings.chargeVat ? (
              <div className="text-emerald-700 font-bold" style={{ color: '#047857', fontWeight: 700 }}><span>الرقم الضريبي:</span> {settings.trn}</div>
            ) : (
              <div className="text-slate-500 font-semibold" style={{ color: '#64748b' }}><span>الرقم الضريبي:</span> غير مسجل</div>
            )}
          </div>
        </div>
      </div>

      {/* Official Document Sub-Header Band */}
      <div className="mt-4 pt-3 border-t border-slate-300 flex flex-wrap items-center justify-between px-2 bg-slate-50 py-2 rounded">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Document Title / اسم المستند</span>
          <span className="text-base font-extrabold text-[#0A1A3C]">{documentTitleEn}</span>
          <span className="text-sm font-bold text-[#C9A05C] font-arabic mr-2"> / {documentTitleAr}</span>
        </div>

        <div className="flex items-center gap-6 text-right">
          {serialNumber && (
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Serial / Ref No.</span>
              <span className="text-sm font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {serialNumber}
              </span>
            </div>
          )}
          {issueDate && (
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Issue Date / التاريخ</span>
              <span className="text-xs font-semibold text-slate-800">{issueDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const OfficialFooter: React.FC<{ settings: CompanySettings }> = ({ settings }) => {
  return (
    <div className="mt-8 pt-4 border-t-2 border-[#0A1A3C] text-[10px] text-slate-600 flex flex-row items-center justify-between gap-2">
      <div>
        <span className="font-bold text-[#0A1A3C]">{settings.tradeNameEn}</span> &bull; Ajman, UAE &bull; License #{settings.licenseNo}
      </div>
      <div className="font-arabic" dir="rtl">
        <span className="font-bold text-[#0A1A3C]">{settings.tradeNameAr}</span> &bull; عجمان، ليوارة 1 &bull; هاتف: {settings.phones[0]}
      </div>
    </div>
  );
};
