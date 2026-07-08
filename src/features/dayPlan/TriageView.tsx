// ════════════════════════════════════════════════════════════════════
// TriageView.tsx — triage 3 horizons : Agir (J0) · Décider (J+1) · Surveiller (J+2)
// Les blocages d'une même chaîne de turnover sont fusionnés en une carte
// unique avec l'ordre de déblocage (départ → ménage → arrivée → enregistrement).
// ════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import type { DayPlanAction, DayPlanResponse, DayPlanStep } from '../../services/fulltaskApi';

const KIND_EMOJI: Record<string, string> = {
  departure: '🛫',
  arrival: '🛬',
  cleaning: '🧹',
  task: '📋',
  message: '💬',
  relance: '🔔',
};

type ChainLink = {
  order: number;
  severity: 'p1' | 'p2';
  label: string;
  meta?: string;
  step: DayPlanStep;
  actions: DayPlanAction[];
};

type ChainGroup = {
  chainId: string;
  listingName: string;
  slackMinutes?: number;
  links: ChainLink[];
};

const LINK_ORDER: Record<string, number> = { departure: 1, cleaning: 2, arrival: 3 };

/** Regroupe les étapes « attention » d'une même chaîne en carte ordonnée. */
function buildChainGroups(steps: DayPlanStep[]): { groups: ChainGroup[]; solo: DayPlanStep[] } {
  const attention = steps.filter((s) => s.state === 'attention');
  const byChain = new Map<string, DayPlanStep[]>();
  const solo: DayPlanStep[] = [];

  for (const s of attention) {
    if (s.chainId) {
      const arr = byChain.get(s.chainId) || [];
      arr.push(s);
      byChain.set(s.chainId, arr);
    } else {
      solo.push(s);
    }
  }

  const groups: ChainGroup[] = [];
  for (const [chainId, chainSteps] of byChain) {
    if (chainSteps.length < 2) {
      solo.push(...chainSteps);
      continue;
    }
    const links: ChainLink[] = chainSteps
      .map((step) => ({
        order: LINK_ORDER[step.kind] ?? 5,
        severity: (step.kind === 'arrival' ? 'p2' : 'p1') as 'p1' | 'p2',
        label: step.attention?.reason || step.title,
        meta: step.attention?.attempted,
        step,
        actions: step.attention?.actions ?? [],
      }))
      .sort((a, b) => a.order - b.order);

    const arrivalStep = chainSteps.find((s) => s.kind === 'arrival');
    if (arrivalStep?.registrationPending) {
      links.push({
        order: 4,
        severity: 'p2',
        label: `Enregistrement voyageurs non fait — ${arrivalStep.guestName || 'guest entrant'}`,
        meta: "Ne bloque pas la chaîne physique, mais retient les codes d'accès (règle E + D1).",
        step: arrivalStep,
        actions: [{ type: 'plan', label: 'Relancer via le plan' }],
      });
    }

    links.forEach((l, i) => { l.order = i + 1; });

    groups.push({
      chainId,
      listingName: chainSteps[0].listingName,
      slackMinutes: chainSteps[0].slackMinutes,
      links,
    });
  }

  return { groups, solo };
}

/** J+2 : items que l'orchestration gère encore (relances/fenêtres en cours). */
function watchedSteps(steps: DayPlanStep[]): DayPlanStep[] {
  return steps
    .filter(
      (s) =>
        s.state === 'pending' &&
        (s.hourUnknown || (s.kind === 'cleaning' && !s.staffName) || s.registrationPending),
    )
    .slice(0, 6);
}

function frDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

interface Props {
  days: (DayPlanResponse | null)[];
  dates: string[];
  loading: boolean;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
  onOpenFil: (date: string) => void;
}

export function TriageView({ days, dates, loading, onAction, onOpenFil }: Props) {
  const [today, d1, d2] = days;

  const todayGroups = useMemo(
    () => (today ? buildChainGroups(today.steps) : { groups: [], solo: [] }),
    [today],
  );
  const tomorrowAttn = useMemo(() => (d1 ? d1.steps.filter((s) => s.state === 'attention') : []), [d1]);
  const d2Watched = useMemo(() => (d2 ? watchedSteps(d2.steps) : []), [d2]);
  const d2Attn = useMemo(() => (d2 ? d2.steps.filter((s) => s.state === 'attention') : []), [d2]);

  const todayCount = todayGroups.groups.length + todayGroups.solo.length;
  const autoCount = today ? today.stats.steps - today.stats.attention : 0;

  if (loading && !today) return <div className="dp-empty">Compilation du triage J0 → J+2…</div>;

  return (
    <div>
      <div className="dp-chips">
        {todayCount > 0 ? (
          <span className="dp-chip attn">⚠ {todayCount} à traiter aujourd'hui</span>
        ) : (
          <span className="dp-chip ok">✓ Rien à traiter aujourd'hui</span>
        )}
        {tomorrowAttn.length > 0 ? (
          <span className="dp-chip frag-normale">⏰ {tomorrowAttn.length} décision{tomorrowAttn.length > 1 ? 's' : ''} demain</span>
        ) : (
          <span className="dp-chip ok">✓ Demain préparé</span>
        )}
        {d2Attn.length === 0 ? (
          <span className="dp-chip ok">✓ Après-demain sous contrôle</span>
        ) : (
          <span className="dp-chip frag-normale">{d2Attn.length} à suivre après-demain</span>
        )}
      </div>

      {/* ── AUJOURD'HUI ── */}
      <div className="dp-hz">
        Aujourd'hui · {frDayLabel(dates[0])}
        <span className="dp-hz-tag act">AGIR MAINTENANT</span>
      </div>

      {todayCount === 0 && (
        <div className="dp-triage-empty">Aucune intervention requise — le plan s'exécute tout seul.</div>
      )}

      {todayGroups.groups.map((g) => (
        <div key={g.chainId} className="dp-chaincard">
          <div className="dp-chaincard-head">
            <span className="dp-chaincard-title">🔄 Turnover {g.listingName} — chaîne bloquée</span>
            <span className="dp-chip attn" style={{ margin: 0 }}>
              {g.links.length} maillons
              {g.slackMinutes != null && ` · marge ${g.slackMinutes < 0 ? 'négative' : `${g.slackMinutes} min`}`}
            </span>
          </div>
          {g.links.map((l) => (
            <div key={l.order} className="dp-chainlink">
              <span className={`dp-chainnum ${l.severity}`}>{l.order}</span>
              <div className="dp-chainbody">
                <span className="dp-chainlabel">{l.label}</span>
                {l.meta && <div className="dp-chainmeta">{l.meta}</div>}
              </div>
              <div className="dp-chainactions">
                {l.actions.slice(0, 2).map((a, i) => (
                  <button key={`${a.type}-${i}`} type="button" onClick={() => onAction(l.step, a)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="dp-chainfoot">Débloquer dans l'ordre 1 → {g.links.length} : chaque étape rouvre la suivante.</div>
        </div>
      ))}

      {todayGroups.solo.map((s) => (
        <div key={s.id} className="dp-attn-card" style={{ marginBottom: 10 }}>
          <div className="dp-attn-reason">
            {KIND_EMOJI[s.kind]} {s.title}
            {s.guestName ? ` — ${s.guestName}` : ''}
          </div>
          {s.attention?.reason && <div className="dp-attn-attempted">{s.attention.reason}</div>}
          {s.attention?.attempted && <div className="dp-attn-attempted">Déjà tenté : {s.attention.attempted}</div>}
          {s.attention?.deadline && (
            <div className="dp-attn-deadline">
              À traiter avant {new Date(s.attention.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <div className="dp-attn-actions">
            {(s.attention?.actions ?? []).map((a, i) => (
              <button key={`${a.type}-${i}`} type="button" className={i === 0 ? 'primary' : ''} onClick={() => onAction(s, a)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {today && autoCount > 0 && (
        <button type="button" className="dp-fil-link" onClick={() => onOpenFil(dates[0])}>
          + {autoCount} étapes automatiques aujourd'hui — voir le fil du jour →
        </button>
      )}

      {/* ── DEMAIN ── */}
      <div className="dp-hz">
        Demain · {frDayLabel(dates[1])}
        <span className="dp-hz-tag decide">DÉCIDER — dérisquable ce soir</span>
      </div>
      {tomorrowAttn.length === 0 && <div className="dp-triage-empty">Rien à décider pour demain — tout est en place.</div>}
      {tomorrowAttn.map((s) => (
        <div key={s.id} className="dp-compact">
          <span className="dp-chip frag-normale" style={{ margin: 0 }}>
            {s.attention?.deadline
              ? new Date(s.attention.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : 'demain'}
          </span>
          <span className="dp-compact-grow">
            {KIND_EMOJI[s.kind]} {s.title}
            {s.guestName ? ` — ${s.guestName}` : ''}
            <span className="dp-compact-meta"> · {s.attention?.reason}</span>
          </span>
          {(s.attention?.actions ?? []).slice(0, 1).map((a, i) => (
            <button key={i} type="button" onClick={() => onAction(s, a)}>{a.label}</button>
          ))}
        </div>
      ))}

      {/* ── APRÈS-DEMAIN ── */}
      <div className="dp-hz">
        Après-demain · {frDayLabel(dates[2])}
        <span className="dp-hz-tag watch">SOUS CONTRÔLE — ne pas toucher</span>
      </div>
      {d2Watched.length === 0 && d2Attn.length === 0 && (
        <div className="dp-triage-empty">Rien à surveiller — journée propre.</div>
      )}
      {d2Attn.map((s) => (
        <div key={s.id} className="dp-compact">
          <span className="dp-chip frag-normale" style={{ margin: 0 }}>à suivre</span>
          <span className="dp-compact-grow">
            {KIND_EMOJI[s.kind]} {s.title}
            <span className="dp-compact-meta"> · {s.attention?.reason}</span>
          </span>
        </div>
      ))}
      {d2Watched.map((s) => (
        <div key={s.id} className="dp-compact watched">
          <span className="dp-chip ok" style={{ margin: 0 }}>✓</span>
          <span className="dp-compact-grow">
            {KIND_EMOJI[s.kind]} {s.title}
            {s.guestName ? ` — ${s.guestName}` : ''}
            <span className="dp-compact-meta">
              {' '}· {s.hourUnknown ? 'relances automatiques encore prévues' : s.registrationPending ? 'relance enregistrement en cours' : "fenêtre d'assignation en cours"} — l'orchestration s'en occupe
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default TriageView;
