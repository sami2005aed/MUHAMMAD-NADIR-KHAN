export function formatAED(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'AED 0.00';
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  // reset hours to compare calendar days
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(dateStr?: string): {
  status: 'valid' | 'expiring_soon' | 'expired';
  days: number | null;
  label: string;
  badgeClass: string;
} {
  const days = getDaysUntil(dateStr);
  if (days === null) {
    return {
      status: 'valid',
      days: null,
      label: 'Not Specified',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  }

  if (days < 0) {
    return {
      status: 'expired',
      days,
      label: `Expired (${Math.abs(days)}d ago)`,
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    };
  }

  if (days <= 30) {
    return {
      status: 'expiring_soon',
      days,
      label: `Expiring soon (${days}d left)`,
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    };
  }

  return {
    status: 'valid',
    days,
    label: `Valid (${days}d left)`,
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };
}

export function maskName(fullName: string): string {
  if (!fullName) return '***';
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map(p => {
      if (p.length <= 2) return p[0] + '*';
      return p[0] + '*'.repeat(Math.max(2, p.length - 2)) + p[p.length - 1];
    })
    .join(' ');
}

export function getNextInvoiceNumber(existingNumbers: string[], year: number = new Date().getFullYear()): string {
  const prefix = `CL-INV-${year}-`;
  let maxSeq = 0;

  for (const invNo of existingNumbers) {
    if (invNo && invNo.startsWith(prefix)) {
      const seqStr = invNo.substring(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

export function getNextAgreementNumber(existingNumbers: string[], year: number = new Date().getFullYear()): string {
  const prefix = `CL-AGR-${year}-`;
  let maxSeq = 0;

  for (const agrNo of existingNumbers) {
    if (agrNo && agrNo.startsWith(prefix)) {
      const seqStr = agrNo.substring(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}
