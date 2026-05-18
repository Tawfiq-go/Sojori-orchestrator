import React, { useCallback, useEffect, useRef } from 'react'
import { buildInjectedCSS } from './WidgetThemePresets'

const STYLE_ID = 'sojori-ru-theme'

export function loadWidget(token, refreshToken, ownerId, languageId = 4) {
  const existingScript = document.querySelector('script[src*="white-pms-client"]')
  if (existingScript) existingScript.remove()

  const container = document.getElementById('ruApp')
  if (container) container.innerHTML = ''

  const script = document.createElement('script')
  const url = new URL('https://new.rentalsunited.com/white-pms-client/script')
  url.searchParams.set('token', token)
  url.searchParams.set('refreshToken', refreshToken)
  url.searchParams.set('languageId', String(languageId))
  url.searchParams.set('uiVersion', '2')
  if (ownerId) url.searchParams.set('ownerId', String(ownerId))
  script.src = url.toString()
  document.head.appendChild(script)
}

export function injectCSS(cssString, id = STYLE_ID) {
  let styleEl = document.getElementById(id)
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = id
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = cssString
}

export default function WidgetPreview({
  config,
  tokens,
  isLoaded,
  onLoaded,
  onReload,
}) {
  const containerRef = useRef(null)
  const { layout, modules, preset } = config
  const activeCount = Object.values(modules).filter(Boolean).length
  const totalCount = Object.keys(modules).length
  const themeLabel = preset ? preset.replace(/-/g, ' ') : 'Custom'

  useEffect(() => {
    const css = buildInjectedCSS({
      modules: config.modules,
      theme: config.theme,
      debugOutline: config.debugOutline,
    })
    injectCSS(css)
  }, [config.modules, config.theme, config.debugOutline])

  const handleLoad = useCallback(() => {
    if (!tokens?.token || !tokens?.refreshToken) return
    loadWidget(
      tokens.token,
      tokens.refreshToken,
      tokens.ownerId || '',
      config.languageId
    )
    onLoaded?.()
  }, [tokens?.token, tokens?.refreshToken, tokens?.ownerId, config.languageId, onLoaded])

  return (
    <div className="widget-preview-wrap" ref={containerRef}>
      <div className="widget-preview-header">
        <span>
          Mode: {layout} | Modules: {activeCount}/{totalCount} actifs | Thème: {themeLabel}
        </span>
        <div className="widget-preview-actions">
          {!isLoaded ? (
            <button type="button" className="btn-load" onClick={handleLoad}>
              Charger le widget
            </button>
          ) : (
            <button type="button" className="btn-reload" onClick={onReload}>
              Recharger
            </button>
          )}
        </div>
      </div>
      <div className="widget-preview-container">
        <div id="ruApp" className="ru-app-container" />
      </div>
      <style>{`
        .widget-preview-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #fff; }
        .widget-preview-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #f5f5f5; border-bottom: 1px solid #E0E0E0; font-size: 13px; color: #555; }
        .widget-preview-actions { display: flex; gap: 8px; }
        .btn-load, .btn-reload { padding: 6px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }
        .btn-load { background: linear-gradient(135deg, #FF6B35, #E55A2B); color: white; }
        .btn-reload { background: #00B4B4; color: white; }
        .btn-load:hover, .btn-reload:hover { opacity: 0.9; }
        .widget-preview-container { flex: 1; border: 1px dashed #E0E0E0; margin: 16px; border-radius: 12px; overflow: auto; min-height: 400px; }
        .ru-app-container { min-height: 100%; padding: 16px; }
      `}</style>
    </div>
  )
}
