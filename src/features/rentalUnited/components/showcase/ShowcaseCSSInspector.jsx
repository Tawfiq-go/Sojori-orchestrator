import React, { useState } from 'react';
import ShowcaseComponentScanner from './ShowcaseComponentScanner';

export default function ShowcaseCSSInspector({
  generatedCSS,
  onCopyCSS,
  onDownloadCSS,
  onResetCSS,
  getIframeDocument,
}) {
  const [tab, setTab] = useState('css');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyCSS?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCSS || ''], { type: 'text/css' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sojori-ru-theme.css';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="showcase-css-inspector">
      <style>{`
        .showcase-css-inspector { display: flex; flex-direction: column; height: 100%; background: #1F2937; color: #e5e7eb; }
        .showcase-css-inspector .tabs { display: flex; gap: 4px; padding: 8px 12px; background: #111827; border-bottom: 1px solid #374151; }
        .showcase-css-inspector .tabs button { padding: 6px 12px; border: none; background: transparent; color: #9ca3af; cursor: pointer; font-size: 12px; border-radius: 4px; }
        .showcase-css-inspector .tabs button.active { background: #374151; color: #fff; }
        .showcase-css-inspector .toolbar { display: flex; gap: 8px; padding: 6px 12px; background: #374151; }
        .showcase-css-inspector .toolbar button { padding: 4px 10px; border-radius: 4px; border: none; background: #00b4b4; color: #fff; cursor: pointer; font-size: 11px; }
        .showcase-css-inspector .content { flex: 1; overflow: auto; }
        .showcase-css-inspector pre { margin: 0; padding: 12px; font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
      `}</style>
      <div className="tabs">
        <button type="button" className={tab === 'css' ? 'active' : ''} onClick={() => setTab('css')}>
          CSS Généré
        </button>
        <button type="button" className={tab === 'scanner' ? 'active' : ''} onClick={() => setTab('scanner')}>
          Scanner de composants
        </button>
      </div>
      {tab === 'css' && (
        <>
          <div className="toolbar">
            <button type="button" onClick={handleCopy}>{copied ? 'Copié !' : 'Copier CSS'}</button>
            <button type="button" onClick={handleDownload}>Télécharger CSS</button>
            <button type="button" onClick={onResetCSS}>Reset</button>
          </div>
          <div className="content">
            <pre>{generatedCSS || '/* Aucun CSS */'}</pre>
          </div>
        </>
      )}
      {tab === 'scanner' && (
        <div className="content">
          <ShowcaseComponentScanner getIframeDocument={getIframeDocument} />
        </div>
      )}
    </div>
  );
}
