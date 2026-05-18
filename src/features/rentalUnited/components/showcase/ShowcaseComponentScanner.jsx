import React, { useState, useCallback } from 'react';

const SCANNER_STYLE_ID = 'sojori-scanner-overrides';

function scanClassesFromDocument(doc) {
  if (!doc) return [];
  const ruApp = doc.getElementById('ruApp');
  if (!ruApp) return [];
  const all = ruApp.querySelectorAll('*');
  const map = new Map();
  all.forEach((el) => {
    el.classList.forEach((cls) => {
      if (!map.has(cls)) {
        map.set(cls, {
          className: cls,
          tagName: el.tagName.toLowerCase(),
          count: 0,
          prefix: cls.split('-')[0] || 'other',
          sample: el,
        });
      }
      map.get(cls).count += 1;
    });
  });
  return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
}

function groupByPrefix(classes) {
  const byPrefix = {};
  classes.forEach((c) => {
    const p = c.prefix || 'other';
    if (!byPrefix[p]) byPrefix[p] = [];
    byPrefix[p].push(c);
  });
  return byPrefix;
}

export default function ShowcaseComponentScanner({ getIframeDocument }) {
  const [classes, setClasses] = useState([]);
  const [filter, setFilter] = useState('');
  const [prefixFilter, setPrefixFilter] = useState('all');
  const [highlighted, setHighlighted] = useState(null);
  const [hidden, setHidden] = useState(new Set());

  const handleScan = useCallback(() => {
    const doc = getIframeDocument?.();
    const result = scanClassesFromDocument(doc);
    setClasses(result);
  }, [getIframeDocument]);

  const doc = getIframeDocument?.();
  const injectScannerStyle = useCallback(
    (css) => {
      if (!doc) return;
      let el = doc.getElementById(SCANNER_STYLE_ID);
      if (!el) {
        el = doc.createElement('style');
        el.id = SCANNER_STYLE_ID;
        doc.head.appendChild(el);
      }
      el.textContent = css;
    },
    [doc]
  );

  const handleHighlight = useCallback(
    (cls) => {
      if (highlighted?.className === cls.className) {
        setHighlighted(null);
        injectScannerStyle('');
        return;
      }
      setHighlighted(cls);
      const sel = cls.className.replace(/([^\w-])/g, '\\$1');
      injectScannerStyle(`#ruApp .${sel} { outline: 2px solid red !important; background: rgba(255,0,0,0.1) !important; }`);
    },
    [highlighted, injectScannerStyle]
  );

  const handleHide = useCallback(
    (cls) => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(cls.className)) next.delete(cls.className);
        else next.add(cls.className);
        const rules = Array.from(next)
          .map((c) => `.${c.replace(/([^\w-])/g, '\\$1')}`)
          .join(', ');
        injectScannerStyle(rules ? `#ruApp ${rules} { display: none !important; }` : '');
        return next;
      });
    },
    [injectScannerStyle]
  );

  const handleCopySelector = useCallback((cls) => {
    navigator.clipboard.writeText(`.${cls.className}`);
  }, []);

  const filtered =
    prefixFilter === 'all'
      ? classes
      : classes.filter((c) => c.prefix === prefixFilter);
  const searchFiltered = filter
    ? filtered.filter((c) => c.className.toLowerCase().includes(filter.toLowerCase()))
    : filtered;
  const byPrefix = groupByPrefix(searchFiltered);
  const prefixes = [...new Set(classes.map((c) => c.prefix))].sort();

  return (
    <div className="showcase-scanner">
      <style>{`
        .showcase-scanner { padding: 12px; color: #e5e7eb; font-size: 12px; height: 100%; overflow: auto; }
        .showcase-scanner h4 { margin: 0 0 8px 0; font-size: 13px; }
        .showcase-scanner .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .showcase-scanner input { padding: 4px 8px; border-radius: 4px; border: 1px solid #374151; background: #111827; color: #e5e7eb; }
        .showcase-scanner button { padding: 4px 8px; border-radius: 4px; border: 1px solid #4b5563; background: #374151; color: #e5e7eb; cursor: pointer; font-size: 11px; }
        .showcase-scanner button:hover { background: #4b5563; }
        .showcase-scanner .class-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid #374151; flex-wrap: wrap; }
        .showcase-scanner .class-row code { background: #374151; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        .showcase-scanner .group { margin-bottom: 12px; }
      `}</style>
      <h4>Scanner le DOM de l&apos;iframe</h4>
      <p className="hint">Chargez le widget puis cliquez sur « Scanner ». Le scan lit le document de l&apos;iframe.</p>
      <div className="toolbar">
        <button type="button" onClick={handleScan}>Scanner</button>
        <button type="button" onClick={() => setClasses([])}>Re-scanner</button>
        <input
          type="text"
          placeholder="Filtrer par nom…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 180 }}
        />
        <select
          value={prefixFilter}
          onChange={(e) => setPrefixFilter(e.target.value)}
          style={{ background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 4, padding: '4px 8px' }}
        >
          <option value="all">Tous préfixes</option>
          {prefixes.map((p) => (
            <option key={p} value={p}>{p}-*</option>
          ))}
        </select>
      </div>
      <div className="list">
        {Object.entries(byPrefix).map(([prefix, items]) => (
          <div key={prefix} className="group">
            <strong>{prefix}-* ({items.length})</strong>
            {items.map((c) => (
              <div key={c.className} className="class-row">
                <code>.{c.className}</code>
                <span>{c.tagName}</span>
                <span>{c.count}</span>
                <button type="button" onClick={() => handleHighlight(c)}>
                  {highlighted?.className === c.className ? 'Unhighlight' : 'Highlight'}
                </button>
                <button type="button" onClick={() => handleHide(c)}>
                  {hidden.has(c.className) ? 'Show' : 'Hide'}
                </button>
                <button type="button" onClick={() => handleCopySelector(c)}>Copier</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
