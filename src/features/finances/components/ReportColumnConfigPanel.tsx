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

function ColumnChip({
  col,
  active,
  disabled,
  onToggle,
}: {
  col: ProfitReportColumnDef;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`chip chip-with-hint ${active ? 'on' : ''}`}
      disabled={disabled}
      onClick={onToggle}
      title={col.hint}
    >
      <span className="chip-label">{col.label}</span>
      <span
        className="chip-i"
        title={col.hint}
        aria-label={col.hint}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="note"
      >
        i
      </span>
    </button>
  );
}

export function ReportColumnConfigPanel({ value, disabled, onChange }: Props) {
  return (
    <div className="report-col-config">
      <div className="fgrp">
        <div className="flabel">Colonnes réservations</div>
        <div className="chips">
          {PROFIT_REPORT_RESERVATION_COLUMNS.map((col) => (
            <ColumnChip
              key={col.key}
              col={col}
              active={value.reservations.includes(col.key)}
              disabled={disabled}
              onToggle={() =>
                onChange({
                  ...value,
                  reservations: toggleKey(value.reservations, col.key, PROFIT_REPORT_RESERVATION_COLUMNS),
                })
              }
            />
          ))}
        </div>
      </div>
      <div className="fgrp" style={{ marginTop: 12 }}>
        <div className="flabel">Colonnes dépenses &amp; extras</div>
        <div className="chips">
          {PROFIT_REPORT_LEDGER_COLUMNS.map((col) => (
            <ColumnChip
              key={col.key}
              col={col}
              active={value.ledger.includes(col.key)}
              disabled={disabled}
              onToggle={() =>
                onChange({
                  ...value,
                  ledger: toggleKey(value.ledger, col.key, PROFIT_REPORT_LEDGER_COLUMNS),
                })
              }
            />
          ))}
        </div>
      </div>
      <p className="sub" style={{ margin: '10px 0 0', fontSize: 11 }}>
        Survole le <b>i</b> pour l’explication. La config est enregistrée dans le rapport (snapshot) — figée à la
        publication. « Réinitialiser » = détail compact (~14 colonnes).
      </p>
    </div>
  );
}

export default ReportColumnConfigPanel;
