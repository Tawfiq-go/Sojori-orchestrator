import type { WizardCapabilities, WizardJxSettings } from '../types';
import {
  applyJxPreset,
  JX_PRESETS,
  jxRowsForCapabilities,
  jxSelectOptions,
  type JxRowDef,
} from '../wizardGuestAccess';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`ob-toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    />
  );
}

type Props = {
  jx: WizardJxSettings;
  capabilities: WizardCapabilities;
  onChange: (jx: WizardJxSettings) => void;
};

export default function OnboardingStepGuestAccess({ jx, capabilities, onChange }: Props) {
  const rows = jxRowsForCapabilities(capabilities);

  const setField = (key: keyof WizardJxSettings, value: string | boolean) => {
    onChange({ ...jx, [key]: value, preset: 'custom' });
  };

  const applyPreset = (id: WizardJxSettings['preset']) => {
    if (id === 'custom') return;
    onChange(applyJxPreset(id));
  };

  const renderValue = (row: JxRowDef) => {
    const val = jx[row.key];
    if (row.toggle) {
      return (
        <Toggle on={Boolean(val)} onChange={(v) => setField(row.key, v)} />
      );
    }
    const options = jxSelectOptions(row, String(val ?? ''));
    return (
      <select
        className="ob-jx-select ob-field ob-field--dense"
        value={String(val ?? options[0] ?? '')}
        onChange={(e) => setField(row.key, e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="ob-sh">
      <div className="eyebrow">Étape 4 · Accès voyageur</div>
      <h1>Quand le voyageur peut-il agir ?</h1>
      <p className="sub">
        Même logique que le modèle orchestration, en version simplifiée. Seuls les services activés à
        l&apos;étape <strong>Parcours client</strong> apparaissent ici.
      </p>

      <div className="ob-preset-grid ob-jx-preset-grid">
        {JX_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ob-preset ob-jx-preset${jx.preset === p.id ? ' on' : ''}`}
            onClick={() => applyPreset(p.id)}
          >
            <div style={{ fontWeight: 800 }}>
              {p.emoji} {p.title}
            </div>
            <div className="ob-jx-preset-desc">{p.desc}</div>
          </button>
        ))}
      </div>

      {jx.preset === 'custom' ? (
        <p className="ob-scope-tab-hint ob-scope-tab-hint--muted">Préréglage personnalisé — lignes modifiées une par une.</p>
      ) : null}

      <div className="ob-card">
        <div className="ob-card-b ob-jx-table">
          {rows.map((row) => (
            <div key={String(row.key)} className="ob-jx-row">
              <span className="ob-jx-emoji" aria-hidden>
                {row.emoji}
              </span>
              <div className="ob-jx-label">
                <div className="ob-jx-label-title">{row.label}</div>
                {row.hint ? <div className="ob-jx-label-hint">{row.hint}</div> : null}
              </div>
              <div className="ob-jx-value">{renderValue(row)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ob-cfg-banner ob-jx-note" style={{ marginTop: 8 }}>
        <span aria-hidden>💡</span>
        <div>
          <p style={{ margin: '0 0 6px' }}>
            Réglages en <strong>J-X</strong> — quand chaque option apparaît dans le menu WhatsApp.
            Affinage (heures, messages planifiés) dans <strong>Annonces → Modèle orchestration</strong>.
          </p>
          <p style={{ margin: 0 }}>
            L&apos;<strong>ordre obligatoire</strong> (enregistrement → créneau → codes) est déduit de vos
            choix — notamment le toggle <strong>codes bloqués sans enregistrement + créneau</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
