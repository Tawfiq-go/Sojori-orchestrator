/**
 * Trie les devises renvoyées par l’API task (ex. getCurrencies) selon un ordre canonique
 * (ex. `currencySortOrder` depuis Channels `fill-company-reference-pickers`).
 */
export function sortCurrenciesByOrderedCodes(currencies, order) {
  if (!Array.isArray(currencies)) return [];
  const codes = Array.isArray(order) ? order.map((c) => String(c || '').toUpperCase()) : [];
  const rank = (code) => {
    const u = String(code || '').toUpperCase();
    const i = codes.indexOf(u);
    return i === -1 ? 999 : i;
  };
  return [...currencies].sort((a, b) => {
    const ra = rank(a.currencyCode);
    const rb = rank(b.currencyCode);
    if (ra !== rb) return ra - rb;
    return String(a.currencyCode || '').localeCompare(String(b.currencyCode || ''));
  });
}
