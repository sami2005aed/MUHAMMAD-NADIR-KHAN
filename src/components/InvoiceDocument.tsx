import React from 'react';
import { Invoice, CompanySettings } from '../types.ts';
import { formatAED, formatDate } from '../utils/formatters.ts';
import { OfficialLetterhead, OfficialFooter } from './OfficialLetterhead.tsx';

interface InvoiceDocumentProps {
  invoice: Invoice;
  settings: CompanySettings;
  qrCodeUrl?: string;
  className?: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  settings,
  qrCodeUrl,
  className = '',
}) => {
  // Requirement 3: VAT is charged ONLY when a TRN is saved in Settings AND chargeVat is ON
  const isVatCharged = Boolean(settings.trn?.trim() && settings.chargeVat);
  const vatAmount = isVatCharged ? Math.round(invoice.subtotal * 0.05 * 100) / 100 : 0;
  const grandTotal = isVatCharged ? Math.round((invoice.subtotal + vatAmount) * 100) / 100 : invoice.subtotal;

  const termsEn =
    settings.invoiceTermsEn ||
    'Service charges are non-refundable. Any refund, where applicable, will take 22 working days to be processed.';
  const termsAr =
    settings.invoiceTermsAr ||
    'رسوم الخدمة غير قابلة للاسترداد. وفي حال وجود مبلغ مستحق الاسترداد، تستغرق معالجة الاسترداد 22 يوم عمل.';

  return (
    <div
      className={`bg-white text-slate-900 font-sans p-6 sm:p-8 select-text ${className}`}
      style={{ width: '100%', maxWidth: '794px', margin: '0 auto', boxSizing: 'border-box' }}
    >
      {/* Official UAE Bilingual Letterhead */}
      <div data-pdf-block="true">
        <OfficialLetterhead
          settings={settings}
          documentTitleEn="TAX / SERVICE INVOICE"
          documentTitleAr="فاتورة ضريبية / خدمات"
          serialNumber={invoice.invoiceNo}
          issueDate={formatDate(invoice.createdAt)}
          qrCodeUrl={qrCodeUrl}
        />
      </div>

      {/* Client & Bill-To Section (Bilingual side-by-side) */}
      <div
        data-pdf-block="true"
        className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 mb-5 bg-slate-50/70 text-xs pdf-avoid-break"
      >
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Billed To / السادة
          </span>
          <div className="text-sm font-extrabold text-[#0A1A3C]">{invoice.clientNameEn}</div>
          {invoice.clientPassport && (
            <div>
              <span className="font-semibold text-slate-700">Passport No:</span> {invoice.clientPassport}
            </div>
          )}
          {invoice.clientEmiratesId && (
            <div>
              <span className="font-semibold text-slate-700">Emirates ID:</span> {invoice.clientEmiratesId}
            </div>
          )}
          {invoice.jobId && (
            <div>
              <span className="font-semibold text-slate-700">Reference Job:</span> {invoice.jobId}
            </div>
          )}
        </div>

        <div className="text-right font-arabic" dir="rtl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            بيانات الفاتورة والدفع
          </span>
          <div className="text-sm font-extrabold text-[#0A1A3C]">
            {invoice.clientNameAr || invoice.clientNameEn}
          </div>
          <div>
            <span className="font-bold text-slate-700">تاريخ الاستحقاق:</span> {formatDate(invoice.dueDate)}
          </div>
          <div>
            <span className="font-bold text-slate-700">حالة السداد:</span>{' '}
            <span className="font-extrabold text-emerald-800">
              {invoice.status === 'Paid' ? 'تم السداد بالكامل (Paid)' : invoice.status}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items Table (Bilingual UAE Layout) */}
      <div data-pdf-block="true" className="border border-slate-300 rounded-lg overflow-hidden mb-5 pdf-avoid-break">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0A1A3C] text-white text-[11px] font-bold">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">
                Description / البيان
                <span className="block font-arabic font-normal text-[10px] text-amber-200">
                  تفاصيل الخدمة الإدارية والطباعة
                </span>
              </th>
              <th className="py-2.5 px-3 text-center w-16">Qty / الكمية</th>
              <th className="py-2.5 px-3 text-right w-24">Unit Price / السعر</th>
              <th className="py-2.5 px-3 text-right w-24">Total / الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.lineItems.map((item, idx) => (
              <tr key={item.id || idx} className="odd:bg-white even:bg-slate-50/60">
                <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                <td className="py-2 px-3">
                  <div className="font-bold text-slate-900">{item.description}</div>
                  {item.descriptionAr && (
                    <div className="font-arabic text-[11px] text-slate-600" dir="rtl">
                      {item.descriptionAr}
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-center text-slate-700">{item.quantity}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-700">
                  {formatAED(item.unitPrice).replace('AED ', '')}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                  {formatAED(item.total).replace('AED ', '')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Calculation Totals Box */}
      <div data-pdf-block="true" className="flex justify-end mb-5 pdf-avoid-break totals-box">
        <div className="w-72 border border-slate-300 rounded-lg p-3 bg-slate-50 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal / المجموع الفرعي:</span>
            <span className="font-mono font-semibold text-slate-900">{formatAED(invoice.subtotal)}</span>
          </div>

          {/* Conditional 5% VAT (Requirement 3: Only when TRN exists and chargeVat is ON) */}
          {isVatCharged && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>VAT 5% / ضريبة القيمة المضافة:</span>
                <span className="font-mono font-semibold text-slate-900">{formatAED(vatAmount)}</span>
              </div>
              <div className="text-[10px] text-emerald-800 font-mono flex justify-between">
                <span>Tax Reg No (TRN):</span>
                <span>{settings.trn}</span>
              </div>
            </>
          )}

          <div className="pt-2 border-t-2 border-[#0A1A3C] flex justify-between font-extrabold text-sm text-[#0A1A3C]">
            <span>Grand Total / الإجمالي (AED):</span>
            <span className="font-mono">{formatAED(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Additional Notes / Remarks */}
      {(invoice.notes || invoice.notesAr) && (
        <div data-pdf-block="true" className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs space-y-1.5 pdf-avoid-break">
          {invoice.notes && (
            <div>
              <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                Remarks / ملاحظات:
              </span>
              <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          )}
          {invoice.notesAr && (
            <div dir="rtl" className="font-arabic text-right">
              <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                {invoice.notesAr}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Requirement 2: Mandatory Bilingual Invoice Terms Note (Above QR Code) */}
      <div
        data-pdf-block="true"
        className="my-4 p-3 bg-amber-50/70 border-l-4 border-[#C9A05C] rounded-r-lg text-xs space-y-1.5 pdf-avoid-break"
      >
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-bold text-[#8A6321] uppercase tracking-wider shrink-0 mt-0.5">
            Notice:
          </span>
          <p className="text-[11px] font-semibold text-slate-800 leading-snug">
            {termsEn}
          </p>
        </div>
        <div className="flex items-start gap-2 justify-end font-arabic" dir="rtl">
          <span className="text-[10px] font-bold text-[#8A6321] shrink-0 mt-0.5">
            تنبيه:
          </span>
          <p className="text-[11px] font-semibold text-slate-800 leading-snug text-right">
            {termsAr}
          </p>
        </div>
      </div>

      {/* Bottom Section: QR Verification & Official Stamp */}
      <div
        data-pdf-block="true"
        className="pt-3 border-t border-slate-300 flex items-center justify-between text-xs pdf-avoid-break signatures-box"
      >
        {/* Verification QR Code (Rendered below terms note as requested) */}
        {qrCodeUrl ? (
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={qrCodeUrl}
              alt="Invoice QR Verification"
              style={{
                width: '64px',
                height: '64px',
                maxWidth: '64px',
                maxHeight: '64px',
                objectFit: 'contain',
                display: 'block',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '2px',
              }}
              className="w-16 h-16 border border-slate-300 p-0.5 rounded shadow-xs"
            />
            <div className="text-[10px] text-slate-600 font-mono leading-tight" style={{ fontSize: '9px', color: '#475569', lineHeight: 1.3 }}>
              <span className="font-bold text-[#0A1A3C] block uppercase" style={{ fontWeight: 700, color: '#0A1A3C', display: 'block' }}>Scan to Verify</span>
              <span>Invoice #{invoice.invoiceNo}</span>
              <span className="block text-[9px] text-slate-500" style={{ display: 'block', fontSize: '8px', color: '#64748b' }}>Official Government Portal</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-mono">
            {invoice.invoiceNo} &bull; Valid Official Receipt
          </div>
        )}

        {/* Official Stamp & Signatory */}
        <div className="text-center flex flex-col items-center justify-end" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div
            style={{ width: '112px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="w-28 h-16 border-2 border-dashed border-amber-600/40 rounded flex items-center justify-center text-[10px] text-amber-800 font-bold uppercase tracking-wider bg-amber-50/20"
          >
            Official Stamp &amp; Seal
          </div>
          <span className="text-[10px] text-slate-600 font-semibold mt-1">
            CORE LINK Administrative Services
          </span>
        </div>
      </div>

      {/* Official UAE Bottom Footer Strip */}
      <div data-pdf-block="true">
        <OfficialFooter settings={settings} />
      </div>
    </div>
  );
};
