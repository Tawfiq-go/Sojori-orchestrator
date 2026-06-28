import {
  PROFIT_REPORT_LEDGER_COLUMNS,
  PROFIT_REPORT_RESERVATION_COLUMNS,
  sortColumnKeys,
  type ProfitReportColumnConfig,
  type ProfitReportColumnDef,
} from '../utils/profitReportColumns';

type Props = {
  value: ProfitReportColumnConfig;
  disabled?: boolean;
  onChange: (next: ProfitReportColumnConfig) => void;
};

function toggleKey(keys: string[], key: string, catalog: ProfitReportColumnDef[]): string[] {
  const next = keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
  return sortColumnKeys(next, catalog);
}

export function ReportColumnConfigPanel({ value, disabled, onChange }: Props) {
  return (
    <div className="report-col-config">
      <div className="fgrp">
        <div className="flabel">Colonnes réservations</div>
        <div className="chips">
          {PROFIT_REPORT_RESERVATION_COLUMNS.map((col) => (
            <button
              key={col.key}
              type="button"
              className={`chip ${value.reservations.includes(col.key) ? 'on' : ''}`}
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  reservations: toggleKey(value.reservations, col.key, PROFIT_REPORT_RESERVATION_COLUMNS),
                })
              }
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>
      <div className="fgrp" style={{ marginTop: 12 }}>
        <div className="flabel">Colonnes dépenses &amp; extras</div>
        <div className="chips">
          {PROFIT_REPORT_LEDGER_COLUMNS.map((col) => (
            <button
              key={col.key}
              type="button"
              className={`chip ${value.ledger.includes(col.key) ? 'on' : ''}`}
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  ledger: toggleKey(value.ledger, col.key, PROFIT_REPORT_LEDGER_COLUMNS),
                })
              }
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>
      <p className="sub" style={{ margin: '10px 0 0', fontSize: 11 }}>
        La configuration est enregistrée dans le rapport (snapshot) — elle reste figée à la publication.
      </p>
    </div>
  );
}

export default ReportColumnConfigPanel;
