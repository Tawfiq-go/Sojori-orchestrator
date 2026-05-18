import React, { useEffect, useRef } from 'react';

/**
 * Iframe white-label RU — même structure que sojori-dashboard (legacy).
 * Le script RU s’injecte dans #ruApp ; le CSS Atelier reste léger (pas de masquage modules).
 */
const RentalUnitedIframe = ({ scriptUrl, isAdmin, openSection }) => {
  const iframeRef = useRef(null);

  const scriptUrlWithSection = (() => {
    if (!scriptUrl || !openSection) return scriptUrl;
    const sep = scriptUrl.includes('?') ? '&' : '?';
    return `${scriptUrl}${sep}openSection=${encodeURIComponent(openSection)}`;
  })();

  useEffect(() => {
    if (!scriptUrlWithSection || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const safeScriptUrl = String(scriptUrlWithSection).replace(/"/g, '&quot;');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rental United Channel Manager</title>
          <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"><\/script>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css">
          <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"><\/script>
          <style>
          body {
            padding: 6px;
          }
            #ruApp {
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            #ruApp .connected-channels-container {
                box-shadow: none !important;
                -webkit-box-shadow: none !important;
                -moz-box-shadow: none !important;
            }
            #ruApp * {
                box-sizing: border-box;
            }
            </style>
        </head>
        <body>
          <div id="ruApp"></div>
          <script src="${safeScriptUrl}"><\/script>
        </body>
        </html>
      `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }, [scriptUrlWithSection]);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: '100%',
        height: isAdmin ? 'calc(100vh - 200px)' : 'calc(100vh - 70px)',
        minHeight: 520,
        border: 'none',
        background: 'white',
        display: 'block',
      }}
      title="Rental United Channel Manager"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
    />
  );
};

export default RentalUnitedIframe;
