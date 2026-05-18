/**
 * Modale récap modifications calendrier RU — port ChannelsHubPage.jsx
 */
import {
  buildCalendarModificationRecap,
  classifyRuModificationLine,
  dynamicPricingMonthWeekdayMaps,
  extractPutPriceSeasonNodes,
  type CalendarRuRecapRow,
} from '../../utils/calendarRecapHelpers';
import { prettyJson } from '../../utils/businessTabHelpers';
import type { summarizeCalendarRuRow } from '../../utils/businessTabHelpers';

export type CalendarRuRecapView = {
  rowId: string;
  merged: CalendarRuRecapRow;
  sum: ReturnType<typeof summarizeCalendarRuRow>;
  recap: ReturnType<typeof buildCalendarModificationRecap>;
};

type Props = {
  view: CalendarRuRecapView | null;
  bodyLoading: boolean;
  onClose: () => void;
  onOpenJsonXml: (rowId: string) => void;
};

export function CalendarRuRecapModal({ view, bodyLoading, onClose, onOpenJsonXml }: Props) {
  if (!view) return null;

  const pc = (view.merged.auditContext?.publishContext || {}) as Record<string, unknown>;
  const isOccupancy = pc.dpTriggerReason === 'occupancy-change-queue';
  const dpd = view.merged.auditContext?.dynamicPricingRuleDetails as
    | Record<string, unknown>
    | undefined;

  return (
    <div
      className="channels-ru-recap-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="channels-ru-recap-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="channels-ru-recap-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="channels-ru-recap-modal-head">
          <h2 id="channels-ru-recap-title" className="channels-ru-recap-modal-title">
            {isOccupancy ? 'Occupation → Calendrier RU (prix)' : 'Modifications · Calendrier RU'}
          </h2>
          <button type="button" className="channels-ru-recap-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        {bodyLoading && !view.recap.hasDetail && !view.merged.requestPayload && (
          <div className="channels-ru-recap-modal-loading">Chargement…</div>
        )}
        <div className="channels-ru-recap-modal-body">
          <dl className="channels-ru-recap-meta">
            <div>
              <dt>Action</dt>
              <dd className="font-mono">{String(view.merged.action || '—')}</dd>
            </div>
            <div>
              <dt>Property</dt>
              <dd className="font-mono">{view.sum.propertyId != null ? String(view.sum.propertyId) : '—'}</dd>
            </div>
            <div>
              <dt>Listing</dt>
              <dd>{view.sum.listingLabel || '—'}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{view.sum.ownerLabel || '—'}</dd>
            </div>
            <div>
              <dt>Message queue (schéma)</dt>
              <dd className="font-mono">
                {view.sum.rabbitSchemaVersion != null ? view.sum.rabbitSchemaDisplay : '— (non enregistré)'}
              </dd>
            </div>
            <div>
              <dt>Plages</dt>
              <dd className="text-orange-700">{view.sum.ranges}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd className="truncate" title={view.sum.sourceTitle || view.sum.source}>
                {view.sum.source}
              </dd>
            </div>
          </dl>
          {view.sum.kindsStr && view.sum.kindsStr !== '—' && (
            <div className="text-xs text-slate-600 mb-3 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded">
              <span className="font-semibold text-slate-700">Types:</span> {view.sum.kindsStr}
            </div>
          )}
          {isOccupancy && (
            <div className="mb-3">
              <div className="channels-ru-recap-section-label mb-2">Occupation · déclencheur</div>
              <div className="text-xs bg-emerald-50 border border-emerald-200 rounded p-2 text-slate-800">
                Fenêtre inventaire :{' '}
                <span className="font-mono">
                  {pc.occupancyWindowFromIso ? String(pc.occupancyWindowFromIso).slice(0, 10) : '—'} →{' '}
                  {pc.occupancyWindowToIso ? String(pc.occupancyWindowToIso).slice(0, 10) : '—'}
                </span>
              </div>
            </div>
          )}
          {!isOccupancy && dpd && (
            <div className="mb-3">
              <div className="channels-ru-recap-section-label mb-2">Règles Dynamic Pricing</div>
              <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  {(dpd.activeRules as Record<string, boolean> | undefined)?.month && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-semibold">✓ Mois</span>
                  )}
                  {(dpd.activeRules as Record<string, boolean> | undefined)?.weekday && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-semibold">✓ Jour semaine</span>
                  )}
                  {(dpd.activeRules as Record<string, boolean> | undefined)?.event && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-[10px] font-semibold">✓ Événements</span>
                  )}
                  {(dpd.activeRules as Record<string, boolean> | undefined)?.occupancy && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-[10px] font-semibold">✓ Occupancy</span>
                  )}
                </div>
                {(() => {
                  const pay = view.merged.requestPayload;
                  if (!pay || typeof pay !== 'object') return null;
                  const seasonList = extractPutPriceSeasonNodes(pay as Record<string, unknown>);
                  if (!seasonList.length) return null;
                  let minDate: Date | null = null;
                  let maxDate: Date | null = null;
                  let totalDays = 0;
                  for (const season of seasonList) {
                    const s = season as Record<string, unknown>;
                    const dateFromStr = s['@_DateFrom'] ?? s['@_From'];
                    const dateToStr = s['@_DateTo'] ?? s['@_To'];
                    if (!dateFromStr || !dateToStr) continue;
                    const from = new Date(String(dateFromStr));
                    const to = new Date(String(dateToStr));
                    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;
                    if (!minDate || from < minDate) minDate = from;
                    if (!maxDate || to > maxDate) maxDate = to;
                    totalDays += Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  }
                  if (!minDate || !maxDate) return null;
                  return (
                    <div className="pt-2 border-t border-amber-200">
                      <div className="font-semibold text-amber-900 mb-1">Période impactée</div>
                      <span className="font-mono text-[11px]">
                        {minDate.toLocaleDateString('fr-FR')} → {maxDate.toLocaleDateString('fr-FR')}
                      </span>
                      <span className="ml-2 px-2 py-0.5 bg-white/80 border border-amber-200 rounded text-[10px] font-semibold">
                        {totalDays} jours
                      </span>
                    </div>
                  );
                })()}
                {(() => {
                  const { monthRules, weekdayRules } = dynamicPricingMonthWeekdayMaps(dpd);
                  if (monthRules && Object.keys(monthRules).length > 0) {
                    return (
                      <div className="pt-2 border-t border-amber-200">
                        <div className="font-semibold text-amber-900 mb-1">Règles mensuelles</div>
                        <div className="grid grid-cols-3 gap-1 text-[11px]">
                          {Object.entries(monthRules).map(([m, f]) => (
                            <div key={m} className="flex justify-between">
                              <span>{m}:</span>
                              <span className="font-mono">×{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  const { weekdayRules } = dynamicPricingMonthWeekdayMaps(dpd);
                  if (weekdayRules && Object.keys(weekdayRules).length > 0) {
                    return (
                      <div className="pt-2 border-t border-amber-200">
                        <div className="font-semibold text-amber-900 mb-1">Règles jour de semaine</div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {Object.entries(weekdayRules).map(([d, f]) => (
                            <div key={d} className="flex justify-between">
                              <span>{d}:</span>
                              <span className="font-mono">×{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
          {view.recap.detailLines.length > 0 ? (
            <div className="channels-ru-modifications-panel">
              <div className="channels-ru-modifications-header">
                <span className="channels-ru-modifications-title">Modifications</span>
                <span className="channels-ru-modifications-count">{view.recap.detailLines.length} ligne(s)</span>
              </div>
              <div className="channels-ru-modifications-scroll">
                {(() => {
                  const lines = view.recap.detailLines;
                  const hasPriceRows = lines.some((ln) => classifyRuModificationLine(ln).kind === 'price');
                  let priceRowIdx = 0;
                  return (
                    <>
                      {hasPriceRows && (
                        <div className="channels-ru-mod-grid-head" aria-hidden="true">
                          <span>Plage</span>
                          <span className="channels-ru-mod-col-num">Prix</span>
                          <span className="channels-ru-mod-col-num">Extra</span>
                        </div>
                      )}
                      {lines.map((line, i) => {
                        const cell = classifyRuModificationLine(line);
                        if (cell.kind === 'truncated') {
                          return (
                            <div key={i} className="channels-ru-mod-truncated">
                              {cell.line}
                            </div>
                          );
                        }
                        if (cell.kind === 'price') {
                          const alt = priceRowIdx % 2 === 1;
                          priceRowIdx += 1;
                          return (
                            <div
                              key={i}
                              className={`channels-ru-mod-row-price${alt ? ' channels-ru-mod-row-price-alt' : ''}`}
                            >
                              <span className="channels-ru-mod-range font-mono">{cell.range}</span>
                              <span className="channels-ru-mod-col-num font-mono text-orange-800">{cell.price}</span>
                              <span className="channels-ru-mod-col-num font-mono text-slate-600">{cell.extra}</span>
                            </div>
                          );
                        }
                        if (cell.kind === 'availability') {
                          return (
                            <div key={i} className="channels-ru-mod-row-availability">
                              {cell.line}
                            </div>
                          );
                        }
                        return (
                          <div key={i} className="channels-ru-mod-row-text">
                            {cell.line}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : bodyLoading ? (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
              Chargement du détail requête…
            </div>
          ) : (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
              Aucune ligne de modification. Utilisez « JSON + XML » pour charger le corps complet.
            </div>
          )}
          <details className="channels-ru-recap-details mt-3">
            <summary className="text-xs text-slate-700 cursor-pointer font-semibold">Audit JSON</summary>
            <pre className="channels-code-block max-h-[160px] overflow-auto mt-1.5">
              {prettyJson(view.merged.auditContext)}
            </pre>
          </details>
        </div>
        <div className="channels-ru-recap-modal-footer">
          <button type="button" className="channels-btn-secondary h-6 px-2.5 text-[10px]" onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className="h-6 px-2.5 text-[10px] font-semibold border border-orange-400 text-white bg-orange-500 hover:bg-orange-600 rounded"
            onClick={() => {
              onOpenJsonXml(view.rowId);
              onClose();
            }}
          >
            JSON + XML
          </button>
        </div>
      </div>
    </div>
  );
}
