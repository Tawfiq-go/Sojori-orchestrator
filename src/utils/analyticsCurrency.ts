/** Les KPIs financiers srv-reservations sont normalisés en MAD (aligné sojori-dashboard). */
export const SOJORI_FINANCIAL_DISPLAY_CURRENCY = 'MAD';

export function normalizeCurrencyCode(raw?: string | null): string {
  const code = String(raw || '')
    .trim()
    .toUpperCase();
  if (!code) return SOJORI_FINANCIAL_DISPLAY_CURRENCY;
  if (code === '€') return 'EUR';
  if (code === '$') return 'USD';
  return code.length === 3 ? code : SOJORI_FINANCIAL_DISPLAY_CURRENCY;
}

export function createCurrencyFormatter(currencyCode: string): Intl.NumberFormat {
  const code = normalizeCurrencyCode(currencyCode);
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    });
  } catch {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: SOJORI_FINANCIAL_DISPLAY_CURRENCY,
      maximumFractionDigits: 0,
    });
  }
}

export function resolveAnalyticsCurrencyContext(
  properties: Array<{ currency?: string | null }>,
): {
  displayCurrency: string;
  listingCurrencies: string[];
  mixedListingCurrencies: boolean;
} {
  const listingCurrencies = [
    ...new Set(properties.map((property) => normalizeCurrencyCode(property.currency))),
  ];
  return {
    displayCurrency: SOJORI_FINANCIAL_DISPLAY_CURRENCY,
    listingCurrencies,
    mixedListingCurrencies: listingCurrencies.length > 1,
  };
}
