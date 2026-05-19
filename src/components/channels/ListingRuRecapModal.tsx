import { prettyJson, summarizeListingRuRow } from '../../utils/businessTabHelpers';
import { buildListingRuRecap, listingActionLabelFr, type ListingRuRecapRow } from '../../utils/listingRecapHelpers';

export type ListingRuRecapView = {
  rowId: string;
  merged: ListingRuRecapRow;
  sum: ReturnType<typeof summarizeListingRuRow>;
  recap: ReturnType<typeof buildListingRuRecap>;
};

type Props = {
  view: ListingRuRecapView | null;
  bodyLoading: boolean;
  onClose: () => void;
  onOpenJsonXml: (rowId: string) => void;
};

export function ListingRuRecapModal({ view, bodyLoading, onClose, onOpenJsonXml }: Props) {
  if (!view) return null;

  return (
    <div
      className="channels-ru-recap-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="channels-listing-recap-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="channels-ru-recap-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="channels-ru-recap-modal-head">
          <h2 id="channels-listing-recap-title" className="channels-ru-recap-modal-title">
            Récap · Listing RU
          </h2>
          <button type="button" className="channels-ru-recap-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        {bodyLoading && !view.recap.hasDetail && (
          <div className="channels-ru-recap-modal-loading">Chargement…</div>
        )}
        <div className="channels-ru-recap-modal-body">
          <dl className="channels-ru-recap-meta">
            <div>
              <dt>Action</dt>
              <dd className="font-mono">{listingActionLabelFr(view.merged.action)}</dd>
            </div>
            <div>
              <dt>Listing</dt>
              <dd>{view.sum.listingLabel || '—'}</dd>
            </div>
            <div>
              <dt>Property RU</dt>
              <dd className="font-mono">{String(view.sum.propertyId)}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd className="font-mono text-[11px]">{view.sum.route}</dd>
            </div>
          </dl>
          <ul className="channels-ru-recap-lines">
            {view.recap.detailLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="channels-ru-recap-modal-actions">
            <button
              type="button"
              className="channels-ru-recap-table-btn"
              onClick={() => onOpenJsonXml(view.rowId)}
            >
              Voir XML / JSON
            </button>
          </div>
          {view.merged.requestPayload ? (
            <pre className="channels-ru-recap-json">{prettyJson(view.merged.requestPayload)}</pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
