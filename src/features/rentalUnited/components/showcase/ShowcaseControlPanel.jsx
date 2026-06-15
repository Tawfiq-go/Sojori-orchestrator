import React from 'react';
import { DEFAULT_MODULES, DEFAULT_THEME, PRESETS } from './showcaseCSS';

const LANGUAGES = [
  { id: 1, label: 'Anglais' },
  { id: 4, label: 'Français' },
  { id: 5, label: 'Espagnol' },
  { id: 6, label: 'Italien' },
];

export default function ShowcaseControlPanel({
  owners,
  selectedOwnerId,
  onOwnerChange,
  onLoadWidget,
  onReload,
  loadingToken,
  tokenError,
  tokenValid,
  modules,
  onModulesChange,
  theme,
  onThemeChange,
  languageId,
  onLanguageChange,
  preset,
  onPresetChange,
  previewWidth,
  onPreviewWidthChange,
  widgetLoaded,
}) {
  const setModuleVisible = (key, visible) => {
    onModulesChange({
      ...modules,
      [key]: { ...modules[key], visible },
    });
  };
  const setModuleSelector = (key, selector) => {
    onModulesChange({
      ...modules,
      [key]: { ...modules[key], selector },
    });
  };
  const setTheme = (key, value) => {
    onThemeChange({ ...theme, [key]: value });
  };

  const activeCount = Object.values(modules).filter((m) => m.visible).length;
  const totalCount = Object.keys(modules).length;

  return (
    <div className="showcase-control-panel">
      <style>{`
        .showcase-control-panel {
          width: 320px; min-width: 320px; background: #fff; border-right: 1px solid #E0E0E0;
          overflow-y: auto; padding: 16px; font-family: 'Inter', sans-serif; font-size: 13px;
        }
        .showcase-control-panel h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #333; }
        .showcase-control-panel .hint { font-size: 11px; color: #888; margin: 0 0 8px 0; }
        .showcase-control-panel label.toggle { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; }
        .showcase-control-panel select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; }
        .showcase-control-panel .btn { padding: 8px 12px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; width: 100%; margin-top: 6px; }
        .showcase-control-panel .btn-primary { background: linear-gradient(135deg, #E6B022, #B8881A); color: white; }
        .showcase-control-panel .btn-secondary { background: #00b4b4; color: white; }
        .showcase-control-panel .token-error { font-size: 12px; color: #c2410c; margin-top: 6px; }
        .showcase-control-panel .section { margin-bottom: 20px; }
        .showcase-control-panel .preset-btns { display: flex; flex-wrap: wrap; gap: 6px; }
        .showcase-control-panel .preset-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; background: #fff; font-size: 12px; cursor: pointer; }
        .showcase-control-panel .preset-btn.active { background: #E6B022; color: white; border-color: #E6B022; }
        .showcase-control-panel input[type="text"].selector { width: 100%; padding: 4px 6px; font-size: 11px; margin-top: 2px; }
      `}</style>

      <div className="section">
        <h3>Connexion widget</h3>
        {owners.length === 0 ? (
          <p className="hint">Aucun owner RU. Configurez un owner sur Channel Manager.</p>
        ) : (
          <>
            <select value={selectedOwnerId} onChange={(e) => onOwnerChange(e.target.value)}>
              <option value="">— Choisir un owner —</option>
              {owners.map((o) => (
                <option key={o._id} value={o._id}>{o.firstName} {o.lastName} ({o.email})</option>
              ))}
            </select>
            {!widgetLoaded ? (
              <button type="button" className="btn btn-primary" onClick={onLoadWidget} disabled={!selectedOwnerId || loadingToken}>
                {loadingToken ? 'Chargement…' : 'Charger le widget'}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onReload} disabled={loadingToken}>
                Recharger
              </button>
            )}
            {tokenValid && <p className="hint">Token valide</p>}
            {tokenError && <p className="token-error">{tokenError}</p>}
          </>
        )}
      </div>

      <div className="section">
        <h3>Presets</h3>
        <div className="preset-btns">
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              className={`preset-btn ${preset === key ? 'active' : ''}`}
              onClick={() => onPresetChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Modules ({activeCount}/{totalCount})</h3>
        {Object.entries(modules).map(([key, { visible, selector, label }]) => (
          <div key={key}>
            <label className="toggle">
              <input type="checkbox" checked={!!visible} onChange={(e) => setModuleVisible(key, e.target.checked)} />
              <span>{label}</span>
            </label>
            <input
              type="text"
              className="selector"
              placeholder="Sélecteur CSS"
              value={selector || ''}
              onChange={(e) => setModuleSelector(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="section">
        <h3>Thème Sojori</h3>
        {Object.entries(DEFAULT_THEME).map(([key, defaultValue]) => (
          <label key={key} className="toggle">
            <input type="checkbox" checked={!!theme[key]} onChange={(e) => setTheme(key, e.target.checked)} />
            <span>{key === 'sojoriColors' ? 'Couleurs' : key === 'sojoriTypo' ? 'Typo Inter' : key === 'sojoriButtons' ? 'Boutons' : key === 'sojoriRadius' ? 'Border radius' : 'Cacher branding RU'}</span>
          </label>
        ))}
      </div>

      <div className="section">
        <h3>Langue</h3>
        <select value={languageId} onChange={(e) => onLanguageChange(Number(e.target.value))}>
          {LANGUAGES.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      <div className="section">
        <h3>Largeur preview</h3>
        <div className="preset-btns">
          {['100%', '1200px', '375px'].map((w) => (
            <button
              key={w}
              type="button"
              className={`preset-btn ${previewWidth === w ? 'active' : ''}`}
              onClick={() => onPreviewWidthChange(w)}
            >
              {w === '100%' ? 'Pleine' : w === '1200px' ? '1200px' : 'Mobile'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
