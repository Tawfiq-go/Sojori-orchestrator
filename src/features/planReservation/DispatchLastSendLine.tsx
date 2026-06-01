import type { PlanLastDispatchView } from './planDispatchDisplay';

export default function DispatchLastSendLine({
  last,
  attempt,
  inline,
}: {
  last?: PlanLastDispatchView;
  /** Tentative plus récente que le succès affiché (ex. renvoi manuel en échec). */
  attempt?: PlanLastDispatchView;
  inline?: boolean;
}) {
  if (!last && !attempt) return null;
  return (
    <div
      className={`plan-dispatch-last ${inline ? 'plan-dispatch-last--inline' : ''}`}
    >
      {last ? (
        <div
          className={`plan-dispatch-last-row ${last.ok ? 'plan-dispatch-last--ok' : 'plan-dispatch-last--fail'}`}
        >
          <span className="plan-dispatch-last-label">{last.label}</span>
          {!last.ok && last.error ? (
            <span className="plan-dispatch-last-err" title={last.error}>
              {last.error}
            </span>
          ) : null}
        </div>
      ) : null}
      {attempt ? (
        <div className="plan-dispatch-last-row plan-dispatch-last--retry">
          <span className="plan-dispatch-last-label">{attempt.label}</span>
          {attempt.error ? (
            <span className="plan-dispatch-last-err" title={attempt.error}>
              {attempt.error}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
