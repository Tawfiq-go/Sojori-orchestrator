/** Extrait un message lisible depuis une erreur API RU / axios / throw legacy. */
export function formatRuError(err: unknown, fallback = 'Impossible de charger Rental United'): string {
  if (err == null) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;

  const record = err as Record<string, unknown>;
  const nested = record.response as { data?: Record<string, unknown> } | undefined;
  const data = nested?.data ?? record;

  const candidates = [
    data?.message,
    data?.error,
    record.message,
    record.error,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      if (value.includes('url" argument must be of type string')) {
        return 'Configuration Rental United manquante sur srv-user (RENTALS_UNITED_WHITE_LABEL_URL). Contactez l’admin infra.';
      }
      return value;
    }
  }

  return fallback;
}
