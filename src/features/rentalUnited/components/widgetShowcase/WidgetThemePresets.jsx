/**
 * Presets de thème pour le widget RU.
 * Applique une config prédéfinie (modules + theme) et génère le CSS associé.
 */

export const PRESETS = {
  'sojori-default': {
    label: 'Sojori Default',
    description: 'Couleurs Sojori, Inter, rates cachés, branding RU caché',
    config: {
      modules: {
        clustersList: true,
        propertyDetails: true,
        connectionWizard: true,
        channelStatus: true,
        ratesPage: false,
        manualOptions: false,
        advancedSettings: true,
        notifications: true,
        sharedComponents: true,
      },
      theme: {
        sojoriColors: true,
        sojoriTypo: true,
        sojoriButtons: true,
        sojoriRadius: true,
        hideRUBranding: true,
      },
    },
  },
  'sojori-minimal': {
    label: 'Sojori Minimal',
    description: 'Liste propriétés + statut channels uniquement',
    config: {
      modules: {
        clustersList: true,
        propertyDetails: false,
        connectionWizard: false,
        channelStatus: true,
        ratesPage: false,
        manualOptions: false,
        advancedSettings: false,
        notifications: false,
        sharedComponents: false,
      },
      theme: {
        sojoriColors: true,
        sojoriTypo: true,
        sojoriButtons: true,
        sojoriRadius: true,
        hideRUBranding: true,
      },
    },
  },
  'sojori-complet': {
    label: 'Sojori Complet',
    description: 'Tout visible sauf manual options et rates',
    config: {
      modules: {
        clustersList: true,
        propertyDetails: true,
        connectionWizard: true,
        channelStatus: true,
        ratesPage: false,
        manualOptions: false,
        advancedSettings: true,
        notifications: true,
        sharedComponents: true,
      },
      theme: {
        sojoriColors: true,
        sojoriTypo: true,
        sojoriButtons: true,
        sojoriRadius: true,
        hideRUBranding: true,
      },
    },
  },
  debug: {
    label: 'Debug',
    description: 'Tout visible, bordures rouges pour identifier les zones',
    config: {
      modules: {
        clustersList: true,
        propertyDetails: true,
        connectionWizard: true,
        channelStatus: true,
        ratesPage: true,
        manualOptions: true,
        advancedSettings: true,
        notifications: true,
        sharedComponents: true,
      },
      theme: {
        sojoriColors: false,
        sojoriTypo: false,
        sojoriButtons: false,
        sojoriRadius: false,
        hideRUBranding: false,
      },
      debugOutline: true,
    },
  },
}

/**
 * Génère le CSS injecté à partir de la config (modules + theme).
 */
export function buildInjectedCSS(config) {
  const { modules, theme, debugOutline } = config
  const lines = ['/* === Sojori WhiteLabel Theme === */', '']

  const hideSelectors = []
  if (!modules.clustersList) hideSelectors.push('.ps-clusters-list-unit-details')
  if (!modules.propertyDetails) hideSelectors.push('[class*="ps-"]:not(.ps-clusters-list-unit-details)')
  if (!modules.connectionWizard) hideSelectors.push('[class*="wizard"], [class*="connection-wizard"]')
  if (!modules.channelStatus) hideSelectors.push('[class*="channel-status"], [class*="channelStatus"]')
  if (!modules.ratesPage) hideSelectors.push('.rp-rate-tile', '[class*="rp-"]')
  if (!modules.manualOptions) hideSelectors.push('[class*="manual-options"], [class*="manualOptions"]')
  if (!modules.advancedSettings) hideSelectors.push('[class*="advanced-settings"], [class*="advancedSettings"]')
  if (!modules.notifications) hideSelectors.push('[class*="notification"]')
  if (!modules.sharedComponents) hideSelectors.push('.sh-extended-input', '[class*="sh-"]')

  if (hideSelectors.length) {
    lines.push('/* Cacher les modules désactivés */')
    const fullSelectors = hideSelectors.map((s) => `#ruApp ${s}`).join(', ')
    lines.push(`${fullSelectors} { display: none !important; }`, '')
  }

  if (theme?.sojoriColors) {
    lines.push('/* Couleurs Sojori */')
    lines.push('#ruApp .ps-clusters-list-unit-details .apartment-name-cell span { color: #FF6B35 !important; }')
    lines.push('#ruApp button.btn-primary, #ruApp .btn-primary {')
    lines.push('  background: linear-gradient(135deg, #FF6B35, #E55A2B) !important;')
    lines.push('  border: none !important;')
    lines.push('  border-radius: 6px !important;')
    lines.push('  color: white !important;')
    lines.push('}')
    lines.push('#ruApp a, #ruApp .link { color: #00B4B4 !important; }')
    lines.push('')
  }

  if (theme?.sojoriTypo) {
    lines.push('/* Typographie */')
    lines.push('#ruApp, #ruApp * { font-family: \'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif !important; }')
    lines.push('')
  }

  if (theme?.sojoriButtons) {
    lines.push('/* Boutons style Sojori */')
    lines.push('#ruApp button, #ruApp .btn { border-radius: 6px !important; }')
    lines.push('#ruApp button:not(.btn-primary):hover, #ruApp .btn:hover { background-color: #f5f5f5 !important; }')
    lines.push('')
  }

  if (theme?.sojoriRadius) {
    lines.push('/* Border radius */')
    lines.push('#ruApp .panel, #ruApp .card, #ruApp [class*="card"], #ruApp [class*="panel"] { border-radius: 12px !important; }')
    lines.push('#ruApp input, #ruApp select, #ruApp .form-control { border-radius: 6px !important; }')
    lines.push('')
  }

  if (theme?.hideRUBranding) {
    lines.push('/* Cacher branding RU */')
    lines.push('#ruApp [class*="rentals-united"], #ruApp [class*="ru-logo"], #ruApp [class*="ru-brand"], #ruApp [class*="RentalsUnited"] { display: none !important; }')
    lines.push('')
  }

  if (debugOutline) {
    lines.push('/* Debug: bordures rouges */')
    lines.push('#ruApp [class] { outline: 1px solid rgba(255,0,0,0.3) !important; }')
    lines.push('')
  }

  return lines.join('\n')
}

export default PRESETS
