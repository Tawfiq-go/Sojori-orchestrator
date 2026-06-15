/**
 * Génère le CSS injecté dans l'iframe à partir de la config (modules, thème, debug).
 * Ce CSS est écrit dans le document de l'iframe (pas dans la page parente).
 */
export function generateShowcaseCSS(config) {
  const { modules = {}, theme = {}, debugMode = false, preset = '' } = config;
  const lines = [
    `/* ═══════════════════════════════════════`,
    `   Sojori WhiteLabel Theme`,
    `   Preset: ${preset || 'Custom'}`,
    `   ═══════════════════════════════════════ */`,
    '',
  ];

  const hideSelectors = [];
  Object.entries(modules).forEach(([key, entry]) => {
    const { visible, selector } = typeof entry === 'object' ? entry : { visible: entry, selector: '' };
    if (!visible && selector) hideSelectors.push(selector);
  });
  if (hideSelectors.length) {
    lines.push('/* --- Modules cachés --- */');
    hideSelectors.forEach((s) => lines.push(`${s} { display: none !important; }`));
    lines.push('');
  }

  if (theme.sojoriColors) {
    lines.push('/* --- Couleurs Sojori --- */');
    lines.push('button.btn-primary, .btn-primary {');
    lines.push('  background: linear-gradient(135deg, #E6B022, #B8881A) !important;');
    lines.push('  border: none !important;');
    lines.push('  border-radius: 6px !important;');
    lines.push('  color: white !important;');
    lines.push('  font-weight: 600 !important;');
    lines.push('  transition: all 0.2s ease !important;');
    lines.push('}');
    lines.push('a, .text-primary { color: #E6B022 !important; }');
    lines.push('.btn-success, .label-success { background: #00b4b4 !important; }');
    lines.push('');
  }

  if (theme.sojoriTypo) {
    lines.push('/* --- Typographie --- */');
    lines.push('* { font-family: \'Inter\', -apple-system, BlinkMacSystemFont, sans-serif !important; }');
    lines.push('');
  }

  if (theme.sojoriButtons) {
    lines.push('/* --- Boutons Sojori --- */');
    lines.push('button.btn-primary:hover, .btn-primary:hover {');
    lines.push('  transform: translateY(-1px) !important;');
    lines.push('  box-shadow: 0 4px 8px rgba(255, 107, 53, 0.3) !important;');
    lines.push('}');
    lines.push('');
  }

  if (theme.sojoriRadius) {
    lines.push('/* --- Border radius --- */');
    lines.push('.panel, .card, [class*="panel"], [class*="card"] { border-radius: 12px !important; }');
    lines.push('input, select, textarea { border-radius: 6px !important; }');
    lines.push('');
  }

  if (theme.hideRUBranding) {
    lines.push('/* --- Branding RU caché --- */');
    lines.push('[class*="ru-logo"], [class*="ru-brand"], [src*="rentalsunited"], .ru-footer { display: none !important; }');
    lines.push('');
  }

  if (debugMode) {
    lines.push('/* --- Debug --- */');
    lines.push('[class*="ps-"] { outline: 2px solid red !important; }');
    lines.push('[class*="rp-"] { outline: 2px solid blue !important; }');
    lines.push('[class*="sh-"] { outline: 2px solid green !important; }');
    lines.push('');
  }

  return lines.join('\n');
}

export const DEFAULT_MODULES = {
  clustersList: { visible: true, selector: '[class*="ps-clusters"]', label: 'Liste propriétés' },
  propertyDetails: { visible: true, selector: '[class*="ps-"]:not([class*="ps-clusters"])', label: 'Détails propriété' },
  connectionWizard: { visible: true, selector: '', label: 'Wizard connexion' },
  channelStatus: { visible: true, selector: '', label: 'Statut channels' },
  ratesPage: { visible: false, selector: '[class*="rp-"]', label: 'Rates / Tarifs' },
  manualOptions: { visible: false, selector: '', label: 'Manual options' },
  advancedSettings: { visible: true, selector: '', label: 'Advanced settings' },
  notifications: { visible: true, selector: '', label: 'Notifications' },
  sharedComponents: { visible: true, selector: '[class*="sh-"]', label: 'Composants partagés' },
};

export const DEFAULT_THEME = {
  sojoriColors: true,
  sojoriTypo: true,
  sojoriButtons: true,
  sojoriRadius: true,
  hideRUBranding: true,
};

export const PRESETS = {
  'sojori-recommended': {
    label: 'Sojori Recommandé',
    modules: { ...DEFAULT_MODULES, ratesPage: { ...DEFAULT_MODULES.ratesPage }, manualOptions: { ...DEFAULT_MODULES.manualOptions } },
    theme: DEFAULT_THEME,
    debugMode: false,
  },
  'sojori-minimal': {
    label: 'Sojori Minimal',
    modules: {
      clustersList: { visible: true, selector: '[class*="ps-clusters"]', label: 'Liste propriétés' },
      propertyDetails: { visible: false, selector: '', label: 'Détails propriété' },
      connectionWizard: { visible: false, selector: '', label: 'Wizard connexion' },
      channelStatus: { visible: true, selector: '', label: 'Statut channels' },
      ratesPage: { visible: false, selector: '[class*="rp-"]', label: 'Rates / Tarifs' },
      manualOptions: { visible: false, selector: '', label: 'Manual options' },
      advancedSettings: { visible: false, selector: '', label: 'Advanced settings' },
      notifications: { visible: true, selector: '', label: 'Notifications' },
      sharedComponents: { visible: false, selector: '[class*="sh-"]', label: 'Composants partagés' },
    },
    theme: DEFAULT_THEME,
    debugMode: false,
  },
  'tout-visible': {
    label: 'Tout visible',
    modules: Object.fromEntries(
      Object.entries(DEFAULT_MODULES).map(([k, v]) => [k, { ...v, visible: true }])
    ),
    theme: { sojoriColors: false, sojoriTypo: false, sojoriButtons: false, sojoriRadius: false, hideRUBranding: false },
    debugMode: false,
  },
  debug: {
    label: 'Debug',
    modules: Object.fromEntries(
      Object.entries(DEFAULT_MODULES).map(([k, v]) => [k, { ...v, visible: true }])
    ),
    theme: { sojoriColors: false, sojoriTypo: false, sojoriButtons: false, sojoriRadius: false, hideRUBranding: false },
    debugMode: true,
  },
};
