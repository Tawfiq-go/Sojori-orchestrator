import React, { useEffect, useRef } from 'react';

const SHOWCASE_STYLE_ID = 'sojori-showcase-css';

/**
 * Iframe pour la showcase : même base que RentalUnitedIframe mais avec
 * un <style id="sojori-showcase-css"> dans le head pour injection CSS dynamique.
 * Le CSS est injecté dans le document de l'iframe (obligatoire car le widget est dans l'iframe).
 */
const ShowcaseIframe = React.forwardRef(({
  scriptUrl,
  customCss = '',
  previewWidth = '100%',
  onIframeDocumentReady,
}, ref) => {
  const iframeRef = useRef(null);
  const resolvedRef = ref || iframeRef;
  const setRef = (el) => {
    iframeRef.current = el;
    if (typeof resolvedRef === 'function') resolvedRef(el);
    else if (resolvedRef) resolvedRef.current = el;
  };

  useEffect(() => {
    if (!scriptUrl || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rental United — Showcase</title>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"><\/script>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css">
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"><\/script>
        <style>
          body { padding: 6px; }
          #ruApp { width: 100%; height: 100%; overflow: hidden; }
          #ruApp * { box-sizing: border-box; }
        </style>
        <style id="${SHOWCASE_STYLE_ID}"></style>
      </head>
      <body>
        <div id="ruApp"></div>
        <script src="${scriptUrl}"><\/script>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    onIframeDocumentReady?.(iframeDoc);
  }, [scriptUrl, onIframeDocumentReady]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const styleEl = doc.getElementById(SHOWCASE_STYLE_ID);
    if (!styleEl) return;
    styleEl.textContent = customCss || '';
  }, [scriptUrl, customCss]);

  const widthStyle =
    previewWidth === '375px'
      ? { width: 375, maxWidth: '100%' }
      : previewWidth === '1200px'
        ? { width: 1200, maxWidth: '100%' }
        : { width: '100%' };

  return (
    <iframe
      ref={setRef}
      style={{
        ...widthStyle,
        height: 'calc(100vh - 280px)',
        minHeight: 400,
        border: '1px dashed #E0E0E0',
        borderRadius: 8,
        background: 'white',
      }}
      title="Rental United Showcase"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
    />
  );
});

ShowcaseIframe.displayName = 'ShowcaseIframe';

export default ShowcaseIframe;
export { SHOWCASE_STYLE_ID };
