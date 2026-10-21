import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Invoice, Agreement, CompanySettings } from './src/types.ts';

function sanitizeText(str: string | undefined | null): string {
  if (!str) return '';
  // Built-in pdf-lib fonts support WinAnsi characters.
  // Replace non-ascii or unsupported characters with a clean ASCII representation.
  return str
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateInvoicePdfBuffer(
  invoice: Invoice,
  settings: CompanySettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const navy = rgb(10 / 255, 26 / 255, 60 / 255);
  const gold = rgb(201 / 255, 160 / 255, 92 / 255);
  const darkSlate = rgb(30 / 255, 41 / 255, 59 / 255);
  const lightGray = rgb(241 / 255, 245 / 255, 249 / 255);
  const borderColor = rgb(203 / 255, 213 / 255, 225 / 255);
  const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);

  // 1. Top Banner
  page.drawRectangle({
    x: 40,
    y: 800,
    width: 515.28,
    height: 22,
    color: navy,
  });
  page.drawText('UNITED ARAB EMIRATES - GOVERNMENT OF AJMAN', {
    x: 50,
    y: 807,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // 2. Letterhead Info
  page.drawText(sanitizeText(settings.tradeNameEn) || 'CORE LINK ADMINISTRATIVE SERVICES', {
    x: 40,
    y: 775,
    size: 14,
    font: fontBold,
    color: navy,
  });
  page.drawText('GOVERNMENT TRANSACTION & BUSINESS SERVICES', {
    x: 40,
    y: 762,
    size: 7.5,
    font: fontBold,
    color: gold,
  });
  page.drawText(`Trade License: ${sanitizeText(settings.licenseNo)} | Legal Form: Individual Establishment`, {
    x: 40,
    y: 750,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });
  page.drawText(`Address: ${sanitizeText(settings.address)} | Tel: ${settings.phones?.join(' / ') || '068055093'}`, {
    x: 40,
    y: 739,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  // Divider
  page.drawLine({
    start: { x: 40, y: 728 },
    end: { x: 555.28, y: 728 },
    thickness: 1.5,
    color: navy,
  });

  // 3. Document Title & Serial Number Strip
  page.drawRectangle({
    x: 40,
    y: 698,
    width: 515.28,
    height: 24,
    color: lightGray,
  });
  page.drawText('TAX / SERVICE INVOICE', {
    x: 48,
    y: 706,
    size: 11,
    font: fontBold,
    color: navy,
  });
  page.drawText(`INVOICE NO: ${invoice.invoiceNo}`, {
    x: 390,
    y: 706,
    size: 10,
    font: fontMono,
    color: navy,
  });

  // 4. Bill To & Invoice Info Box
  page.drawRectangle({
    x: 40,
    y: 630,
    width: 515.28,
    height: 60,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: borderColor,
    borderWidth: 1,
  });

  // Left column (Customer)
  page.drawText('BILLED TO (CLIENT DETAILS):', {
    x: 50,
    y: 676,
    size: 7.5,
    font: fontBold,
    color: textMuted,
  });
  page.drawText(sanitizeText(invoice.clientNameEn) || 'Walk-in Client', {
    x: 50,
    y: 662,
    size: 10,
    font: fontBold,
    color: navy,
  });
  const passportStr = invoice.clientPassport ? `Passport: ${invoice.clientPassport}` : '';
  const eidStr = invoice.clientEmiratesId ? `Emirates ID: ${invoice.clientEmiratesId}` : '';
  const idCombined = [passportStr, eidStr].filter(Boolean).join(' | ');
  if (idCombined) {
    page.drawText(idCombined, {
      x: 50,
      y: 648,
      size: 8,
      font: fontRegular,
      color: darkSlate,
    });
  }

  // Right column (Dates & Status)
  page.drawText(`Issue Date: ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}`, {
    x: 380,
    y: 674,
    size: 8.5,
    font: fontRegular,
    color: darkSlate,
  });
  page.drawText(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, {
    x: 380,
    y: 660,
    size: 8.5,
    font: fontRegular,
    color: darkSlate,
  });
  page.drawText(`Payment Status: ${invoice.status.toUpperCase()}`, {
    x: 380,
    y: 646,
    size: 8.5,
    font: fontBold,
    color: invoice.status === 'Paid' ? rgb(16 / 255, 120 / 255, 80 / 255) : rgb(180 / 255, 40 / 255, 40 / 255),
  });

  // 5. Line Items Table Header
  let tableY = 600;
  page.drawRectangle({
    x: 40,
    y: tableY,
    width: 515.28,
    height: 20,
    color: navy,
  });
  page.drawText('#', { x: 48, y: tableY + 6, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Description of Service', { x: 75, y: tableY + 6, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Qty', { x: 370, y: tableY + 6, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Unit (AED)', { x: 420, y: tableY + 6, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Total (AED)', { x: 490, y: tableY + 6, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  // Rows
  tableY -= 20;
  (invoice.lineItems || []).forEach((item, index) => {
    page.drawRectangle({
      x: 40,
      y: tableY,
      width: 515.28,
      height: 20,
      color: index % 2 === 0 ? rgb(1, 1, 1) : lightGray,
      borderColor: borderColor,
      borderWidth: 0.5,
    });
    page.drawText(String(index + 1), { x: 48, y: tableY + 6, size: 8, font: fontRegular, color: darkSlate });
    const desc = sanitizeText(item.description).slice(0, 52);
    page.drawText(desc, { x: 75, y: tableY + 6, size: 8, font: fontRegular, color: darkSlate });
    page.drawText(String(item.quantity), { x: 375, y: tableY + 6, size: 8, font: fontRegular, color: darkSlate });
    page.drawText(item.unitPrice.toFixed(2), { x: 425, y: tableY + 6, size: 8, font: fontRegular, color: darkSlate });
    page.drawText(item.total.toFixed(2), { x: 495, y: tableY + 6, size: 8, font: fontBold, color: darkSlate });
    tableY -= 20;
  });

  // 6. Totals Box
  tableY -= 10;
  const isVatCharged = Boolean(settings.trn?.trim() && settings.chargeVat);
  const vatAmount = isVatCharged ? Math.round(invoice.subtotal * 0.05 * 100) / 100 : 0;
  const grandTotal = isVatCharged ? Math.round((invoice.subtotal + vatAmount) * 100) / 100 : invoice.subtotal;

  const totalsBoxX = 350;
  const totalsBoxW = 205.28;

  page.drawRectangle({
    x: totalsBoxX,
    y: tableY - 45,
    width: totalsBoxW,
    height: 55,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: borderColor,
    borderWidth: 1,
  });

  page.drawText('Subtotal:', { x: totalsBoxX + 10, y: tableY - 5, size: 8.5, font: fontRegular, color: darkSlate });
  page.drawText(`AED ${invoice.subtotal.toFixed(2)}`, { x: totalsBoxX + 110, y: tableY - 5, size: 8.5, font: fontRegular, color: darkSlate });

  if (isVatCharged) {
    page.drawText(`VAT (5%) - TRN ${settings.trn}:`, { x: totalsBoxX + 10, y: tableY - 20, size: 8, font: fontRegular, color: darkSlate });
    page.drawText(`AED ${vatAmount.toFixed(2)}`, { x: totalsBoxX + 110, y: tableY - 20, size: 8, font: fontRegular, color: darkSlate });
  } else {
    page.drawText('VAT (Not Applicable):', { x: totalsBoxX + 10, y: tableY - 20, size: 8, font: fontRegular, color: textMuted });
    page.drawText('AED 0.00', { x: totalsBoxX + 110, y: tableY - 20, size: 8, font: fontRegular, color: textMuted });
  }

  page.drawLine({
    start: { x: totalsBoxX + 10, y: tableY - 26 },
    end: { x: totalsBoxX + totalsBoxW - 10, y: tableY - 26 },
    thickness: 1,
    color: borderColor,
  });

  page.drawText('GRAND TOTAL:', { x: totalsBoxX + 10, y: tableY - 40, size: 9.5, font: fontBold, color: navy });
  page.drawText(`AED ${grandTotal.toFixed(2)}`, { x: totalsBoxX + 110, y: tableY - 40, size: 10, font: fontBold, color: navy });

  // 7. Terms & Conditions
  const termsY = tableY - 75;
  page.drawText('TERMS & CONDITIONS:', { x: 40, y: termsY, size: 8, font: fontBold, color: navy });
  const termsText = sanitizeText(settings.invoiceTermsEn) ||
    'Service charges are non-refundable. Any refund, where applicable, will take 22 working days to be processed.';
  const wrappedTerms = wrapText(termsText, 100);
  wrappedTerms.forEach((line, idx) => {
    page.drawText(line, { x: 40, y: termsY - 12 - idx * 11, size: 7.5, font: fontRegular, color: textMuted });
  });

  // 8. Signatures Block
  const sigY = 120;
  page.drawLine({ start: { x: 50, y: sigY }, end: { x: 200, y: sigY }, thickness: 1, color: borderColor });
  page.drawText('Customer Signature', { x: 75, y: sigY - 12, size: 8, font: fontRegular, color: textMuted });

  page.drawLine({ start: { x: 395, y: sigY }, end: { x: 545, y: sigY }, thickness: 1, color: borderColor });
  page.drawText('Authorized Signatory & Seal', { x: 405, y: sigY - 12, size: 8, font: fontRegular, color: textMuted });

  // 9. Official Footer
  page.drawLine({ start: { x: 40, y: 50 }, end: { x: 555.28, y: 50 }, thickness: 0.5, color: borderColor });
  page.drawText(
    'CORE LINK Administrative Services - Ajman, UAE - Tel: 068055093 - License #140290',
    { x: 120, y: 38, size: 7.5, font: fontRegular, color: textMuted }
  );

  return pdfDoc.save();
}

export async function generateAgreementPdfBuffer(
  agreement: Agreement,
  settings: CompanySettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const navy = rgb(10 / 255, 26 / 255, 60 / 255);
  const gold = rgb(201 / 255, 160 / 255, 92 / 255);
  const darkSlate = rgb(30 / 255, 41 / 255, 59 / 255);
  const lightGray = rgb(241 / 255, 245 / 255, 249 / 255);
  const borderColor = rgb(203 / 255, 213 / 255, 225 / 255);
  const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);

  // 1. Top Banner
  page.drawRectangle({ x: 40, y: 800, width: 515.28, height: 22, color: navy });
  page.drawText('UNITED ARAB EMIRATES - GOVERNMENT OF AJMAN', {
    x: 50,
    y: 807,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // 2. Letterhead Info
  page.drawText(sanitizeText(settings.tradeNameEn) || 'CORE LINK ADMINISTRATIVE SERVICES', {
    x: 40,
    y: 775,
    size: 14,
    font: fontBold,
    color: navy,
  });
  page.drawText('OFFICIAL LEGAL AGREEMENT / ADMINISTRATIVE SERVICE CONTRACT', {
    x: 40,
    y: 762,
    size: 7.5,
    font: fontBold,
    color: gold,
  });
  page.drawText(`Trade License: ${sanitizeText(settings.licenseNo)} | Ajman, UAE | Tel: ${settings.phones?.join(' / ') || '068055093'}`, {
    x: 40,
    y: 750,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  page.drawLine({ start: { x: 40, y: 738 }, end: { x: 555.28, y: 738 }, thickness: 1.5, color: navy });

  // 3. Document Sub-Header
  page.drawRectangle({ x: 40, y: 708, width: 515.28, height: 24, color: lightGray });
  page.drawText(`AGREEMENT: ${sanitizeText(agreement.templateName).toUpperCase()}`, {
    x: 48,
    y: 716,
    size: 9.5,
    font: fontBold,
    color: navy,
  });
  page.drawText(`REF NO: ${agreement.serialNo}`, {
    x: 390,
    y: 716,
    size: 9.5,
    font: fontMono,
    color: navy,
  });

  // 4. Contracting Parties Box
  page.drawRectangle({
    x: 40,
    y: 636,
    width: 515.28,
    height: 64,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: borderColor,
    borderWidth: 1,
  });

  page.drawText('FIRST PARTY (SERVICE PROVIDER):', { x: 50, y: 686, size: 7.5, font: fontBold, color: textMuted });
  page.drawText(sanitizeText(settings.tradeNameEn), { x: 50, y: 674, size: 9, font: fontBold, color: navy });
  page.drawText(`License No: ${sanitizeText(settings.licenseNo)} | Ajman, UAE`, { x: 50, y: 662, size: 8, font: fontRegular, color: darkSlate });
  page.drawText(`Tel: ${settings.phones?.[0] || '068055093'} | Email: ${settings.emails?.[0] || 'admin@corelinkservices.ae'}`, {
    x: 50,
    y: 650,
    size: 8,
    font: fontRegular,
    color: darkSlate,
  });

  page.drawText('SECOND PARTY (CLIENT):', { x: 310, y: 686, size: 7.5, font: fontBold, color: textMuted });
  page.drawText(sanitizeText(agreement.clientNameEn), { x: 310, y: 674, size: 9, font: fontBold, color: navy });
  page.drawText(`Passport: ${agreement.clientPassport || 'N/A'}`, { x: 310, y: 662, size: 8, font: fontRegular, color: darkSlate });
  page.drawText(`Emirates ID: ${agreement.clientEmiratesId || 'N/A'}`, { x: 310, y: 650, size: 8, font: fontRegular, color: darkSlate });

  // 5. Terms & Provisions Body
  let clauseY = 615;
  page.drawText('CONTRACTUAL TERMS & CONDITIONS:', { x: 40, y: clauseY, size: 8.5, font: fontBold, color: navy });
  clauseY -= 15;

  const rawBody = sanitizeText(agreement.renderedBodyEn) || 'Standard terms and administrative conditions apply.';
  const lines = rawBody.split('\n').flatMap((l) => wrapText(l, 90));

  for (const line of lines.slice(0, 32)) {
    if (clauseY < 160) break;
    page.drawText(line, { x: 40, y: clauseY, size: 8, font: fontRegular, color: darkSlate });
    clauseY -= 12;
  }

  // 6. Signatures
  const sigY = 110;
  page.drawLine({ start: { x: 50, y: sigY }, end: { x: 200, y: sigY }, thickness: 1, color: borderColor });
  page.drawText('First Party (Authorized Signatory)', { x: 55, y: sigY - 12, size: 7.5, font: fontRegular, color: textMuted });

  page.drawLine({ start: { x: 395, y: sigY }, end: { x: 545, y: sigY }, thickness: 1, color: borderColor });
  page.drawText('Second Party (Client Signature)', { x: 405, y: sigY - 12, size: 7.5, font: fontRegular, color: textMuted });

  // 7. Footer
  page.drawLine({ start: { x: 40, y: 45 }, end: { x: 555.28, y: 45 }, thickness: 0.5, color: borderColor });
  page.drawText('CORE LINK Administrative Services - Official Agreement - Ajman, UAE', {
    x: 150,
    y: 34,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  return pdfDoc.save();
}

export async function generateReportPdfBuffer(
  reportData: any,
  settings: CompanySettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const navy = rgb(10 / 255, 26 / 255, 60 / 255);
  const gold = rgb(201 / 255, 160 / 255, 92 / 255);
  const darkSlate = rgb(30 / 255, 41 / 255, 59 / 255);
  const lightGray = rgb(241 / 255, 245 / 255, 249 / 255);
  const borderColor = rgb(203 / 255, 213 / 255, 225 / 255);
  const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);

  page.drawRectangle({ x: 40, y: 800, width: 515.28, height: 22, color: navy });
  page.drawText('UNITED ARAB EMIRATES - GOVERNMENT OF AJMAN', {
    x: 50,
    y: 807,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(sanitizeText(settings.tradeNameEn) || 'CORE LINK ADMINISTRATIVE SERVICES', {
    x: 40,
    y: 775,
    size: 14,
    font: fontBold,
    color: navy,
  });
  page.drawText('EXECUTIVE BUSINESS MANAGEMENT REPORT', {
    x: 40,
    y: 762,
    size: 8,
    font: fontBold,
    color: gold,
  });
  page.drawText(`Date Generated: ${new Date().toLocaleDateString('en-GB')}`, {
    x: 40,
    y: 750,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  page.drawLine({ start: { x: 40, y: 738 }, end: { x: 555.28, y: 738 }, thickness: 1.5, color: navy });

  page.drawRectangle({ x: 40, y: 700, width: 515.28, height: 26, color: lightGray });
  page.drawText(`REPORT SCOPE: ${sanitizeText(reportData?.scope || 'All Operations')}`, {
    x: 50,
    y: 709,
    size: 9.5,
    font: fontBold,
    color: navy,
  });

  // Summary Metrics Box
  page.drawRectangle({
    x: 40,
    y: 620,
    width: 515.28,
    height: 65,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: borderColor,
    borderWidth: 1,
  });

  const rev = Number(reportData?.totalRevenue || 0).toFixed(2);
  const exp = Number(reportData?.totalExpenses || 0).toFixed(2);
  const net = Number(reportData?.netProfit || 0).toFixed(2);

  page.drawText('Total Revenue (AED)', { x: 55, y: 665, size: 8, font: fontRegular, color: textMuted });
  page.drawText(`AED ${rev}`, { x: 55, y: 645, size: 12, font: fontBold, color: rgb(16 / 255, 120 / 255, 80 / 255) });

  page.drawText('Total Expenses (AED)', { x: 220, y: 665, size: 8, font: fontRegular, color: textMuted });
  page.drawText(`AED ${exp}`, { x: 220, y: 645, size: 12, font: fontBold, color: rgb(220 / 255, 38 / 255, 38 / 255) });

  page.drawText('Net Operating Profit (AED)', { x: 380, y: 665, size: 8, font: fontRegular, color: textMuted });
  page.drawText(`AED ${net}`, { x: 380, y: 645, size: 12, font: fontBold, color: navy });

  page.drawLine({ start: { x: 40, y: 50 }, end: { x: 555.28, y: 50 }, thickness: 0.5, color: borderColor });
  page.drawText('CORE LINK Administrative Services - Executive Audit Report - Ajman, UAE', {
    x: 130,
    y: 38,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  return pdfDoc.save();
}
