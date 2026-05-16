// ════════════════════════════════════════════════════════════════════
// Sojori — Price Formatting Utilities
// Format prices with exactly 2 decimal places
// ════════════════════════════════════════════════════════════════════

/**
 * Format a number to 2 decimal places
 * Examples:
 *   20319.950000000004 → "20319.95"
 *   100 → "100.00"
 *   123.4 → "123.40"
 */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0.00';

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0.00';

  return num.toFixed(2);
}

/**
 * Format a price with currency
 * Examples:
 *   (20319.95, 'MAD') → "20319.95 MAD"
 *   (100, 'EUR') → "100.00 EUR"
 */
export function formatPriceWithCurrency(
  value: number | string | null | undefined,
  currency: string = 'MAD'
): string {
  return `${formatPrice(value)} ${currency}`;
}

/**
 * Format a price or return a placeholder
 * Examples:
 *   (null, 'MAD') → "—"
 *   (100, 'EUR') → "100.00 EUR"
 */
export function formatPriceOrPlaceholder(
  value: number | string | null | undefined,
  currency: string = 'MAD',
  placeholder: string = '—'
): string {
  if (value === null || value === undefined || value === '') return placeholder;

  return formatPriceWithCurrency(value, currency);
}
