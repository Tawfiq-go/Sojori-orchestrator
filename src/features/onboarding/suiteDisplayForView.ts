import type { WizardDraft } from './types';
import type { OnboardingSuiteViewMode } from './resolveOwnerId';

/** Ligne réservée audit / technique — masquée au PM. */
function isAuditOrTechnicalLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.includes('— Audit')) return true;
  if (/^\[20\d{2}-/.test(t)) return true;
  if (/Owner [a-f0-9]{24}/i.test(t)) return true;
  if (t.includes('replace=')) return true;
  if (t.includes('Capabilities PUT')) return true;
  if (t.includes('Owner après GET')) return true;
  if (t.includes('Activations envoyées')) return true;
  if (t.includes('Wizard ON (')) return true;
  if (t.includes('J-X patchés')) return true;
  if (/RU #\d+/i.test(t)) return true;
  if (t.startsWith('⚠ Écarts')) return true;
  return false;
}

function pmFriendlyLine(stepId: string, line: string): string {
  let out = line;
  if (stepId === 'plan') {
    out = out
      .replace('Plan orchestration owner créé / mis à jour', 'Plan orchestration enregistré')
      .replace(/ services activés dans le template/g, ' services activés')
      .replace(/ menus parcours client \(J-X\) configurés/g, ' options parcours voyageur configurées')
      .replace('Conditions staff appliquées', "Règles d'accès staff appliquées")
      .replace(/ workflows délais staff configurés/g, ' délais équipe configurés')
      .replace(/listing\(s\)/gi, 'annonce(s)')
      .replace(/ synchronisé\(s\) avec le plan orchestration/g, ' reliée(s) à votre plan');
  }
  return out;
}

/** Lignes affichées dans la suite selon le rôle (PM vs admin). */
export function suiteStepLinesForView(
  mode: OnboardingSuiteViewMode,
  stepId: string,
  lines: string[] | undefined,
  applyLog?: WizardDraft['applyLog'],
): string[] | undefined {
  if (!lines?.length && stepId !== 'plan') return lines;
  const raw = lines ?? [];

  if (mode === 'admin') {
    if (stepId === 'plan' && applyLog?.orchestrationAuditLines?.length) {
      const hasAuditInLines = raw.some((l) => l.includes('— Audit'));
      if (!hasAuditInLines) {
        return [...raw, '— Audit orchestration —', ...applyLog.orchestrationAuditLines];
      }
    }
    return raw.length ? raw : undefined;
  }

  const filtered = raw
    .filter((line) => !isAuditOrTechnicalLine(line))
    .map((line) => pmFriendlyLine(stepId, line));

  const deduped = [...new Set(filtered.filter(Boolean))];
  return deduped.length ? deduped : undefined;
}

export function suiteRunningSubtitleText(mode: OnboardingSuiteViewMode): string {
  if (mode === 'admin') {
    return 'Exécution en cours — admin WA → staff → dashboard → plan → import';
  }
  return 'Mise en place de votre configuration en cours…';
}
