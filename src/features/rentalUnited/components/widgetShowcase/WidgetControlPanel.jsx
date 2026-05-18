import React from 'react'
import { PRESETS } from './WidgetThemePresets'

const LAYOUTS = [
  { value: 'fullpage', label: 'Pleine page' },
  { value: 'tabs', label: 'Onglets' },
  { value: 'sidebar', label: 'Sidebar + contenu' },
  { value: 'accordion', label: 'Accordion' },
]

const LANGUAGES = [
  { id: 1, label: 'Anglais' },
  { id: 4, label: 'Français' },
  { id: 5, label: 'Espagnol' },
  { id: 6, label: 'Italien' },
]

export default function WidgetControlPanel({ config, onConfigChange, onPresetChange }) {
  const { modules, theme, layout, preset, languageId } = config

  const setModules = (key, value) =>
    onConfigChange({ ...config, modules: { ...modules, [key]: value } })
  const setTheme = (key, value) =>
    onConfigChange({ ...config, theme: { ...theme, [key]: value } })
  const setLayout = (value) => onConfigChange({ ...config, layout: value })
  const setLanguageId = (id) => onConfigChange({ ...config, languageId: Number(id) })

  const activeModulesCount = Object.values(modules).filter(Boolean).length
  const totalModules = Object.keys(modules).length

  return (
    <div className="widget-control-panel">
      <div className="panel-section">
        <h3>Preset</h3>
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: 6 }}
        >
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="panel-section">
        <h3>Modules (ON/OFF)</h3>
        <p className="hint">Modules : {activeModulesCount}/{totalModules} actifs</p>
        {[
          { key: 'clustersList', label: 'Liste des propriétés (.ps-clusters-list-unit-details)' },
          { key: 'propertyDetails', label: 'Détails propriété / unit' },
          { key: 'connectionWizard', label: 'Wizard connexion channel' },
          { key: 'channelStatus', label: 'Statut par channel' },
          { key: 'ratesPage', label: 'Page Rates / Tarifs (.rp-*)' },
          { key: 'manualOptions', label: 'Manual options' },
          { key: 'advancedSettings', label: 'Advanced settings' },
          { key: 'notifications', label: 'Notifications' },
          { key: 'sharedComponents', label: 'Composants partagés (.sh-*)' },
        ].map(({ key, label }) => (
          <label key={key} className="toggle-row">
            <input
              type="checkbox"
              checked={!!modules[key]}
              onChange={(e) => setModules(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="panel-section">
        <h3>Thème CSS Sojori</h3>
        {[
          { key: 'sojoriColors', label: 'Couleurs Sojori (orange, turquoise)' },
          { key: 'sojoriTypo', label: 'Typographie Inter' },
          { key: 'sojoriButtons', label: 'Boutons style Sojori' },
          { key: 'sojoriRadius', label: 'Border radius (12px cards, 6px inputs)' },
          { key: 'hideRUBranding', label: 'Cacher le branding RU' },
        ].map(({ key, label }) => (
          <label key={key} className="toggle-row">
            <input
              type="checkbox"
              checked={!!theme[key]}
              onChange={(e) => setTheme(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="panel-section">
        <h3>Layout du widget</h3>
        {LAYOUTS.map(({ value, label }) => (
          <label key={value} className="toggle-row">
            <input
              type="radio"
              name="layout"
              checked={layout === value}
              onChange={() => setLayout(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="panel-section">
        <h3>Langue</h3>
        <select
          value={languageId}
          onChange={(e) => setLanguageId(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: 6 }}
        >
          {LANGUAGES.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      <style>{`
        .widget-control-panel {
          width: 320px;
          min-width: 320px;
          background: #FAFAFA;
          border-right: 1px solid #E0E0E0;
          overflow-y: auto;
          padding: 16px;
          font-family: 'Inter', sans-serif;
        }
        .panel-section { margin-bottom: 20px; }
        .panel-section h3 { font-size: 14px; font-weight: 600; color: #333; margin: 0 0 10px 0; }
        .panel-section .hint { font-size: 12px; color: #666; margin: -6px 0 8px 0; }
        .toggle-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px; cursor: pointer; }
        .toggle-row input[type="checkbox"], .toggle-row input[type="radio"] { margin: 0; }
      `}</style>
    </div>
  )
}
