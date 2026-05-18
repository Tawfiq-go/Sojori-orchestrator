import React from 'react';
import ShowcaseIframe from './ShowcaseIframe';

export default function ShowcaseWidgetPreview({
  iframeRef,
  scriptUrl,
  customCss,
  previewWidth,
  ownerName,
  activeModulesCount,
  totalModulesCount,
  presetLabel,
  languageLabel,
  tokenStatus,
}) {
  return (
    <div className="showcase-widget-preview">
      <style>{`
        .showcase-widget-preview { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #FAFAFA; }
        .showcase-widget-preview .bandeau {
          display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 10px 16px;
          background: #fff; border-bottom: 1px solid #E0E0E0; font-size: 12px; color: #555;
        }
        .showcase-widget-preview .bandeau strong { color: #333; }
        .showcase-widget-preview .iframe-wrap { padding: 16px; flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: flex-start; }
      `}</style>
      <div className="bandeau">
        <span><strong>Owner:</strong> {ownerName || '—'}</span>
        <span>|</span>
        <span><strong>Modules:</strong> {activeModulesCount}/{totalModulesCount} actifs</span>
        <span>|</span>
        <span><strong>Preset:</strong> {presetLabel || 'Custom'}</span>
        <span>|</span>
        <span><strong>Langue:</strong> {languageLabel || '—'}</span>
        <span>|</span>
        <span><strong>Token:</strong> {tokenStatus || '—'}</span>
      </div>
      <div className="iframe-wrap">
        {scriptUrl ? (
          <ShowcaseIframe
            ref={iframeRef}
            scriptUrl={scriptUrl}
            customCss={customCss}
            previewWidth={previewWidth}
          />
        ) : (
          <div style={{ padding: 24, color: '#888' }}>
            Sélectionnez un owner et cliquez sur « Charger le widget ».
          </div>
        )}
      </div>
    </div>
  );
}
