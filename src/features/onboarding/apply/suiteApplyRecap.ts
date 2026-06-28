import type { ImportResultItem } from '../../components/listing/import-airbnb/_tokens';
import type { ApplyOrchestrationResult } from './applyOnboardingOrchestration';
import type { ApplyStaffResult } from './applyOnboardingStaff';

export type ApplyRecap = {
  headline: string;
  lines: string[];
};

function pluralFr(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

const ROLE_CREATED: Record<string, { label: string; key: string }> = {
  'Staff tâches': { label: 'staff OPS', key: 'staff' },
  'Admin WhatsApp': { label: 'admin WhatsApp', key: 'wa' },
  Dashboard: { label: 'accès dashboard', key: 'dash' },
};

/** Récap équipe : totaux par type + détail par personne. */
export function formatStaffApplyRecap(
  result: ApplyStaffResult,
  options?: { phaseLabel?: string },
): ApplyRecap {
  const totals = { staff: 0, wa: 0, dash: 0, staffSkip: 0, waSkip: 0, dashSkip: 0 };

  for (const row of result.results) {
    for (const c of row.created) {
      const m = ROLE_CREATED[c];
      if (m?.key === 'staff') totals.staff += 1;
      if (m?.key === 'wa') totals.wa += 1;
      if (m?.key === 'dash') totals.dash += 1;
    }
    for (const s of row.skipped) {
      if (s.includes('Staff')) totals.staffSkip += 1;
      if (s.includes('Admin WhatsApp')) totals.waSkip += 1;
      if (s.includes('Dashboard')) totals.dashSkip += 1;
    }
  }

  const headlineParts: string[] = [];
  if (totals.staff > 0) {
    headlineParts.push(
      `${totals.staff} ${pluralFr(totals.staff, 'staff OPS ajouté', 'staff OPS ajoutés')}`,
    );
  }
  if (totals.wa > 0) {
    headlineParts.push(
      `${totals.wa} ${pluralFr(totals.wa, 'admin WhatsApp ajouté', 'admins WhatsApp ajoutés')}`,
    );
  }
  if (totals.dash > 0) {
    headlineParts.push(
      `${totals.dash} ${pluralFr(totals.dash, 'accès dashboard ajouté', 'accès dashboard ajoutés')}`,
    );
  }
  const skipTotal = totals.staffSkip + totals.waSkip + totals.dashSkip;
  if (skipTotal > 0) {
    headlineParts.push(
      `${skipTotal} ${pluralFr(skipTotal, 'compte déjà présent', 'comptes déjà présents')}`,
    );
  }
  if (result.failed > 0) {
    headlineParts.push(`${result.failed} échec(s)`);
  }

  const headline =
    headlineParts.length > 0
      ? options?.phaseLabel
        ? `${options.phaseLabel} — ${headlineParts.join(' · ')}`
        : headlineParts.join(' · ')
      : options?.phaseLabel
        ? `${options.phaseLabel} — rien à créer`
        : 'Aucun compte créé';

  const lines = result.results.map((row) => {
    const parts: string[] = [];
    for (const c of row.created) {
      const m = ROLE_CREATED[c];
      parts.push(m ? `${m.label} créé` : `${c} créé`);
    }
    for (const s of row.skipped) {
      parts.push(s.replace(' (déjà)', ' déjà présent').replace('Staff tâches', 'staff OPS'));
    }
    if (row.error) parts.push(`échec : ${row.error}`);
    return `${row.name} — ${parts.length ? parts.join(' · ') : 'aucune action'}`;
  });

  return { headline, lines };
}

/** Récap plan orchestration owner. */
export function formatOrchestrationApplyRecap(
  result: ApplyOrchestrationResult,
  options?: {
    listingsPropagated?: number;
    phase?: 'template' | 'propagate';
    /** pm = libellés voyage PM · admin = inclut audit dans les lignes si fourni */
    audience?: 'pm' | 'admin';
  },
): ApplyRecap {
  const audience = options?.audience ?? 'pm';
  const lines: string[] = [];

  if (options?.phase !== 'propagate') {
    if (audience === 'pm') {
      lines.push('Plan orchestration enregistré');
      if (result.capabilitiesApplied > 0) {
        lines.push(`${result.capabilitiesApplied} services activés`);
      }
      if (result.jxPatched > 0) {
        lines.push(`${result.jxPatched} options parcours voyageur configurées`);
      }
      if (result.conditionsApplied) {
        lines.push("Règles d'accès staff appliquées");
      }
      if (result.deadlinesPatched > 0) {
        lines.push(`${result.deadlinesPatched} délais équipe configurés`);
      }
      if (result.listingsUpdated > 0) {
        lines.push(`${result.listingsUpdated} annonce(s) reliée(s) au plan`);
      }
      if (result.warnings.length > 0) {
        lines.push(`Note : ${result.warnings.join(' · ')}`);
      }
    } else {
      lines.push('Plan orchestration owner créé / mis à jour');
      if (result.capabilitiesApplied > 0) {
        lines.push(`${result.capabilitiesApplied} services activés dans le template`);
      }
      if (result.jxPatched > 0) {
        lines.push(`${result.jxPatched} menus parcours client (J-X) configurés`);
      }
      if (result.conditionsApplied) {
        lines.push('Conditions staff appliquées');
      }
      if (result.deadlinesPatched > 0) {
        lines.push(`${result.deadlinesPatched} workflows délais staff configurés`);
      }
      if (result.listingsUpdated > 0) {
        lines.push(`${result.listingsUpdated} listing(s) synchronisé(s) avec le plan`);
      }
      if (result.warnings.length > 0) {
        lines.push(`Note : ${result.warnings.join(' · ')}`);
      }
      if (result.auditLines?.length) {
        lines.push('— Audit orchestration —');
        lines.push(...result.auditLines);
      }
    }
  }

  const propagated = options?.listingsPropagated ?? result.listingsUpdated;
  if (options?.phase === 'propagate' && propagated > 0) {
    lines.push(`${propagated} listing(s) importé(s) relié(s) au plan orchestration`);
  }

  const headline =
    options?.phase === 'propagate'
      ? `${propagated} ${audience === 'pm' ? 'annonce(s) reliée(s) au plan' : 'listing(s) synchronisé(s) avec le plan'}`
      : audience === 'pm'
        ? [
            'Plan orchestration enregistré',
            result.capabilitiesApplied > 0 ? `${result.capabilitiesApplied} services` : null,
            result.jxPatched > 0 ? `${result.jxPatched} parcours voyageur` : null,
            result.deadlinesPatched > 0 ? `${result.deadlinesPatched} délais équipe` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : [
            'Plan orchestration appliqué',
            result.capabilitiesApplied > 0 ? `${result.capabilitiesApplied} services` : null,
            result.jxPatched > 0 ? `${result.jxPatched} menus J-X` : null,
            result.deadlinesPatched > 0 ? `${result.deadlinesPatched} délais` : null,
          ]
            .filter(Boolean)
            .join(' · ');

  return { headline, lines: lines.length ? lines : [headline] };
}

/** Récap import RU. */
export function formatImportApplyRecap(
  results: ImportResultItem[],
  options?: { listingsPropagated?: number; audience?: 'pm' | 'admin' },
): ApplyRecap {
  const audience = options?.audience ?? 'pm';
  const ok = results.filter((r) => r.success);
  const fail = results.filter((r) => !r.success);

  const headlineParts = [
    ok.length > 0
      ? `${ok.length} ${pluralFr(ok.length, 'annonce importée', 'annonces importées')}`
      : null,
    fail.length > 0 ? `${fail.length} échec(s)` : null,
    options?.listingsPropagated != null && options.listingsPropagated > 0
      ? `${options.listingsPropagated} listing(s) relié(s) au plan`
      : null,
  ].filter(Boolean);

  const headline = headlineParts.length ? headlineParts.join(' · ') : 'Aucune annonce importée';

  const lines = results.map((r) => {
    const fallback = audience === 'pm' ? 'Annonce' : `RU #${r.ruPropertyId}`;
    const name = r.listingName || r.propertyName || fallback;
    const city = r.city ? ` · ${r.city}` : '';
    if (r.success) return `✓ ${name}${city}`;
    return `✗ ${name} — ${r.errorMessage || 'échec'}`;
  });

  return { headline, lines };
}

/** Fusionne récap import + propagation en une seule étape. */
export function mergeImportRecap(
  importRecap: ApplyRecap,
  listingsPropagated: number,
): ApplyRecap {
  if (listingsPropagated <= 0) return importRecap;
  return {
    headline: `${importRecap.headline} · ${listingsPropagated} listing(s) relié(s) au plan`,
    lines: [
      ...importRecap.lines,
      `${listingsPropagated} listing(s) synchronisé(s) avec le plan orchestration`,
    ],
  };
}

/** Récap global suite terminée. */
export function formatSuiteFinalRecap(steps: Array<{ label: string; headline?: string; lines?: string[] }>): ApplyRecap {
  const lines: string[] = [];
  for (const step of steps) {
    if (step.headline) lines.push(`${step.label} : ${step.headline}`);
    if (step.lines?.length) lines.push(...step.lines.map((l) => `  ${l}`));
  }
  const headline = steps
    .filter((s) => s.headline)
    .map((s) => s.headline)
    .join(' · ');
  return { headline: headline || 'Onboarding appliqué', lines };
}
