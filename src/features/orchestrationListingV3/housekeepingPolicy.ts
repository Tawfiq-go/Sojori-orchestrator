/** Politique ménage listing — miroir srv-listing utils/cleaningRules (HousekeepingPolicyConfig).
 *  Logique pure (parse + défauts) séparée du panneau pour être testable via node:test. */

export type HousekeepingPolicyConfig = {
  creation?: 'auto' | 'manual';
  assignment?: 'auto' | 'manual' | 'supervisor';
  notification?: 'immediate' | 'digest' | 'none';
  /** HH:mm, heure Africa/Casablanca. */
  digestTime?: string;
};

export const HOUSEKEEPING_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DIGEST_TIME_DEFAULT = '08:00';

/** Politique effective en toutes lettres (card « En un coup d'œil »).
 *  Champ non configuré → défaut système hôtel, marqué « (défaut) ». */
export function describeHousekeepingPolicy(policy: HousekeepingPolicyConfig | null): string[] {
  const p = policy ?? {};
  const creation =
    p.creation === 'auto'
      ? 'Création automatique'
      : p.creation === 'manual'
        ? 'Création manuelle (SM)'
        : 'Création manuelle (défaut hôtel)';
  const assignment =
    p.assignment === 'auto'
      ? 'Assignation auto'
      : p.assignment === 'manual'
        ? 'Assignation manuelle'
        : p.assignment === 'supervisor'
          ? 'Assignation superviseur'
          : 'Assignation superviseur (défaut)';
  const notification =
    p.notification === 'immediate'
      ? 'Notification immédiate'
      : p.notification === 'none'
        ? 'Sans notification'
        : p.notification === 'digest'
          ? `Digest ${p.digestTime ?? '17:00'}`
          : 'Digest 17:00 (défaut)';
  return [creation, assignment, notification];
}

/** Ne garde que les valeurs valides ; null si rien de configuré. */
export function normalizeHousekeepingPolicy(raw: unknown): HousekeepingPolicyConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: HousekeepingPolicyConfig = {};
  if (r.creation === 'auto' || r.creation === 'manual') out.creation = r.creation;
  if (r.assignment === 'auto' || r.assignment === 'manual' || r.assignment === 'supervisor') {
    out.assignment = r.assignment;
  }
  if (r.notification === 'immediate' || r.notification === 'digest' || r.notification === 'none') {
    out.notification = r.notification;
  }
  if (typeof r.digestTime === 'string' && HOUSEKEEPING_TIME_RE.test(r.digestTime)) {
    out.digestTime = r.digestTime;
  }
  return Object.keys(out).length ? out : null;
}
