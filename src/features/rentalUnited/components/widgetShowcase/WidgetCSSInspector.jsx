import React, { useState } from 'react'
import { buildInjectedCSS } from './WidgetThemePresets'

export default function WidgetCSSInspector({ config }) {
  const [copied, setCopied] = useState(false)

  const cssString = buildInjectedCSS({
    modules: config.modules,
    theme: config.theme,
    debugOutline: config.debugOutline,
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(cssString).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="widget-css-inspector">
      <div className="inspector-toolbar">
        <span className="inspector-title">CSS généré</span>
        <button type="button" className="btn-export" onClick={handleCopy}>
          {copied ? 'Copié !' : 'Copier / Exporter CSS'}
        </button>
      </div>
      <pre className="inspector-code">{cssString || '/* Aucun CSS */'}</pre>
      <style>{`
        .widget-css-inspector { display: flex; flex-direction: column; height: 100%; min-height: 200px; background: #1e1e1e; color: #d4d4d4; font-family: 'Monaco', 'Menlo', monospace; font-size: 12px; }
        .inspector-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #252526; border-bottom: 1px solid #333; }
        .inspector-title { font-weight: 600; }
        .btn-export { padding: 4px 10px; border-radius: 6px; border: none; background: #00B4B4; color: white; cursor: pointer; font-size: 12px; }
        .btn-export:hover { opacity: 0.9; }
        .inspector-code { flex: 1; margin: 0; padding: 12px; overflow: auto; white-space: pre; line-height: 1.5; }
      `}</style>
    </div>
  )
}
