import type { ProfitReportHeader } from '../types';

export function emptyProfitReportHeader(): ProfitReportHeader {
  return {
    companyName: '',
    tagline: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logoUrl: '',
    logoText: '',
  };
}

export function normalizeProfitReportHeader(
  raw?: Partial<ProfitReportHeader> | null,
): ProfitReportHeader {
  const base = emptyProfitReportHeader();
  if (!raw) return base;
  return {
    companyName: String(raw.companyName || raw.publicName || '').trim(),
    tagline: String(raw.tagline || '').trim(),
    email: String(raw.email || '').trim(),
    phone: String(raw.phone || '').trim(),
    address: String(raw.address || '').trim(),
    website: String(raw.website || '').trim(),
    logoUrl: String(raw.logoUrl || '').trim(),
    logoText: String(raw.logoText || '').trim(),
  };
}
