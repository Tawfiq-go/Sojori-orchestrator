import React, { useState, useCallback } from 'react'

export function scanWidgetClasses() {
  const ruApp = document.getElementById('ruApp')
  if (!ruApp) return []

  const allElements = ruApp.querySelectorAll('*')
  const classMap = new Map()

  allElements.forEach((el) => {
    el.classList.forEach((cls) => {
      if (!classMap.has(cls)) {
        classMap.set(cls, {
          className: cls,
          tagName: el.tagName.toLowerCase(),
          count: 0,
          prefix: cls.split('-')[0] || 'other',
          sample: el,
        })
      }
    })
    el.classList.forEach((cls) => {
      const entry = classMap.get(cls)
      if (entry) entry.count++
    })
  })

  return Array.from(classMap.values()).sort((a, b) =>
    a.className.localeCompare(b.className)
  )
}

function groupByPrefix(classes) {
  const byPrefix = {}
  classes.forEach((c) => {
    const p = c.prefix || 'other'
    if (!byPrefix[p]) byPrefix[p] = []
    byPrefix[p].push(c)
  })
  return byPrefix
}

const HIGHLIGHT_STYLE_ID = 'ru-scanner-highlight'
const HIDE_CLASSES_STYLE_ID = 'ru-scanner-hide-classes'

function highlightElement(el, on) {
  let styleEl = document.getElementById(HIGHLIGHT_STYLE_ID)
  if (on && el) {
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = HIGHLIGHT_STYLE_ID
      document.head.appendChild(styleEl)
    }
    const id = el.id || `ru-el-${Math.random().toString(36).slice(2)}`
    if (!el.id) el.id = id
    styleEl.textContent = `#${id} { outline: 2px solid red !important; background: rgba(255,0,0,0.1) !important; }`
  } else if (styleEl) {
    styleEl.textContent = ''
  }
}

function applyHiddenClasses(hiddenClasses) {
  let styleEl = document.getElementById(HIDE_CLASSES_STYLE_ID)
  if (hiddenClasses.size === 0) {
    if (styleEl) styleEl.textContent = ''
    return
  }
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = HIDE_CLASSES_STYLE_ID
    document.head.appendChild(styleEl)
  }
  const selectors = Array.from(hiddenClasses)
    .map((c) => `.${c.replace(/([^\w-])/g, '\\$1')}`)
    .join(', ')
  styleEl.textContent = `#ruApp ${selectors} { display: none !important; }`
}

export default function WidgetComponentScanner() {
  const [classes, setClasses] = useState([])
  const [highlighted, setHighlighted] = useState(null)
  const [hiddenClasses, setHiddenClasses] = useState(new Set())

  const handleScan = useCallback(() => {
    const result = scanWidgetClasses()
    setClasses(result)
  }, [])

  const handleHighlight = useCallback((cls) => {
    if (highlighted?.className === cls.className) {
      highlightElement(null, false)
      setHighlighted(null)
      return
    }
    highlightElement(cls.sample, true)
    setHighlighted(cls)
  }, [highlighted])

  const handleHide = useCallback((cls) => {
    setHiddenClasses((prev) => {
      const next = new Set(prev)
      if (next.has(cls.className)) next.delete(cls.className)
      else next.add(cls.className)
      return next
    })
  }, [])

  React.useEffect(() => {
    applyHiddenClasses(hiddenClasses)
  }, [hiddenClasses])

  const byPrefix = groupByPrefix(classes)

  return (
    <div className="widget-component-scanner">
      <div className="scanner-toolbar">
        <h3>Composants détectés</h3>
        <button type="button" className="btn-scan" onClick={handleScan}>
          Scan le DOM
        </button>
      </div>
      <p className="scanner-hint">
        Chargez le widget puis cliquez sur &quot;Scan le DOM&quot;. Les classes sont groupées par préfixe (ps-, rp-, sh-, etc.).
      </p>
      <div className="scanner-list">
        {Object.entries(byPrefix).map(([prefix, items]) => (
          <div key={prefix} className="scanner-group">
            <h4>{prefix}-* ({items.length})</h4>
            <ul>
              {items.map((c) => (
                <li key={c.className} className="scanner-item">
                  <code>{c.className}</code>
                  <span className="tag">{c.tagName}</span>
                  <span className="count">{c.count}</span>
                  <button type="button" className="btn-small" onClick={() => handleHighlight(c)}>
                    {highlighted?.className === c.className ? 'Unhighlight' : 'Highlight'}
                  </button>
                  <button type="button" className="btn-small" onClick={() => handleHide(c)}>
                    {hiddenClasses.has(c.className) ? 'Show' : 'Hide'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <style>{`
        .widget-component-scanner { padding: 16px; font-family: 'Inter', sans-serif; font-size: 13px; overflow-y: auto; }
        .scanner-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .scanner-toolbar h3 { margin: 0; font-size: 14px; }
        .btn-scan { padding: 6px 12px; border-radius: 6px; border: none; background: #E6B022; color: white; cursor: pointer; }
        .scanner-hint { color: #666; font-size: 12px; margin: 0 0 12px 0; }
        .scanner-group { margin-bottom: 16px; }
        .scanner-group h4 { margin: 0 0 8px 0; font-size: 13px; color: #333; }
        .scanner-list ul { list-style: none; padding: 0; margin: 0; }
        .scanner-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #eee; }
        .scanner-item code { font-size: 12px; background: #f0f0f0; padding: 2px 6px; border-radius: 4px; flex: 1; min-width: 0; }
        .scanner-item .tag { color: #00B4B4; font-size: 11px; }
        .scanner-item .count { color: #999; font-size: 11px; }
        .btn-small { padding: 2px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #ddd; background: #fff; cursor: pointer; }
        .btn-small:hover { background: #f5f5f5; }
      `}</style>
    </div>
  )
}
