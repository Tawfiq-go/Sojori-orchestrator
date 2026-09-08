/** Ce que le voyageur lit dans WhatsApp pour le ménage inclus, d’après menageOps. */
export function cleaningGuestPreview(listingValues: Record<string, unknown>): string[] {
  const ops = listingValues.menageOps as
    | { included?: { enabled?: boolean; always?: boolean; everyNDays?: number; byRoomType?: Record<string, { always: boolean; everyNDays: number }> } }
    | undefined;
  const multi = String(listingValues.propertyUnit || '') === 'Multi';
  const inc = ops?.included;
  if (!inc || inc.enabled === false) {
    return ['Ménage inclus désactivé : la ligne 🧹 Ménage propose seulement le ménage payant, s’il est activé.'];
  }
  const cadence = (c: { always?: boolean; everyNDays?: number }) =>
    c.always ? (Number(c.everyNDays) >= 2 ? 'un jour sur deux' : 'tous les jours') : 'selon les paliers de la durée du séjour';
  const lines = [`Ménage inclus ${cadence(inc)}, hors jour d’arrivée et de départ.`];
  if (multi) {
    const byType = Object.entries(inc.byRoomType || {});
    lines.push(
      inc.always
        ? 'Hôtel : intro « Décidez à l’avance quand le ménage sera fait… » puis le Flow créneaux par jour.'
        : 'Hôtel : Flow ménage inclus / payant (paliers).',
    );
    if (byType.length) {
      lines.push(`${byType.length} type${byType.length > 1 ? 's' : ''} de chambre avec sa propre cadence : le chatbot applique celle du type réservé.`);
    }
  } else {
    lines.push('LCD : Flow ménage inclus / payant, le voyageur choisit ses jours et son créneau.');
  }
  return lines;
}
