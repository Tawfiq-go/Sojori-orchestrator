import type { GuestPreview } from '../../../../services/guestPreviewApi';

/** Rubrique de la fiche → lignes du menu à mettre en avant. */
export type GuestPreviewFocus = 'breakfast' | 'card' | 'stay' | 'experiences' | 'cleaning';

export const FOCUS_CODES: Record<GuestPreviewFocus, string[]> = {
  breakfast: ['J4'],
  card: ['J4'],
  stay: ['O'],
  experiences: ['J', 'J1'],
  cleaning: ['I'],
};

/** Ce que la porte montre, en une ligne, d'après les chiffres du chatbot. */
export function doorSummary(p: GuestPreview, focus: GuestPreviewFocus): string[] {
  const d = p.doors;
  switch (focus) {
    case 'breakfast':
      return d.breakfast.on
        ? [`Porte « Petit déjeuner inclus » ouverte · ${d.breakfast.formulas} formule${d.breakfast.formulas > 1 ? 's' : ''} au choix, jours et options.`]
        : ['Aucune porte petit déjeuner : activez le PDJ et incluez au moins une formule.'];
    case 'card':
      return d.paidCard.on
        ? [`Porte « Room service » ouverte · ${d.paidCard.dishes} plat${d.paidCard.dishes > 1 ? 's' : ''} ou catégorie${d.paidCard.dishes > 1 ? 's' : ''} payant${d.paidCard.dishes > 1 ? 's' : ''}.`]
        : ['Aucune carte payante : ajoutez un plat non inclus au petit déjeuner, avec le service Room Service activé dans Orchestration.'];
    case 'stay': {
      const parts = [
        d.stayOptions.ambiances ? `${d.stayOptions.ambiances} ambiance${d.stayOptions.ambiances > 1 ? 's' : ''}` : null,
        d.stayOptions.privatePool ? 'piscine privée' : null,
        d.stayOptions.beds ? 'beds piscine' : null,
      ].filter(Boolean);
      return parts.length
        ? [`Ligne « Options séjour » visible · ${parts.join(' · ')}.`]
        : ['Ligne « Options séjour » masquée : aucune ambiance, piscine ou beds activée.'];
    }
    case 'experiences': {
      const lines: string[] = [];
      lines.push(
        d.experiences.on
          ? `Bouton « Expériences » · ${d.experiences.count} proposée${d.experiences.count > 1 ? 's' : ''}.`
          : 'Pas de bouton « Expériences » : aucune expérience proposée dans WhatsApp.',
      );
      lines.push(
        d.transport.on
          ? `Bouton « Navette » · ${d.transport.count} trajet${d.transport.count > 1 ? 's' : ''}.`
          : 'Pas de bouton « Navette » (Orchestration → Transport).',
      );
      return lines;
    }
    case 'cleaning': {
      const c = d.cleaning;
      const cadence = c.cadence.always
        ? c.cadence.everyNDays >= 2
          ? 'un jour sur deux'
          : 'tous les jours'
        : 'selon les paliers de durée';
      const lines = [`Ménage inclus ${cadence}.`];
      if (c.recouche && c.intro) lines.push(`Intro envoyée : « ${c.intro} »`);
      lines.push(
        c.flow === 'timeslots'
          ? 'Puis le Flow « créneaux par jour » (hôtel, recouche).'
          : 'Puis le Flow « ménage inclus / payant » (jours et créneau au choix).',
      );
      return lines;
    }
    default:
      return [];
  }
}
