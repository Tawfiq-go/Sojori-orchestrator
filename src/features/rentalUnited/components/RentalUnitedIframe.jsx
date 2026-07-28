import React, { useEffect, useMemo, useRef } from 'react';

/**
 * Navigated iframe → /ru-embed.html (no CSP on that document).
 * document.write/srcdoc inherit parent CSP and break RU base + pms-dist.
 */
const RentalUnitedIframe = ({ scriptUrl, isAdmin, openSection, onWidgetError }) => {
  const iframeRef = useRef(null);
  const reportedRef = useRef(false);
  const embedSrc = useMemo(() => {
    if (!scriptUrl) return null;
    let url = scriptUrl;
    if (openSection) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}openSection=${encodeURIComponent(openSection)}`;
    }
    return `/ru-embed.html?script=${encodeURIComponent(url)}`;
  }, [scriptUrl, openSection]);

  // Health-check : le token RU peut être invalidé sous nos pieds (rotation par une
  // autre instance, refresh interne du widget). L'app Angular affiche alors
  // « OOOPS » / error_occurred_message sans erreur console côté parent.
  // Iframe same-origin → on lit son texte et on remonte l'erreur UNE fois par src.
  useEffect(() => {
    reportedRef.current = false;
    if (!embedSrc || !onWidgetError) return undefined;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      // 3 min de surveillance max — passé ça, une erreur tardive = action user (reload manuel)
      if (Date.now() - startedAt > 3 * 60 * 1000) {
        clearInterval(timer);
        return;
      }
      if (reportedRef.current) return;
      let text = '';
      let booted = false;
      try {
        const doc = iframeRef.current?.contentDocument;
        text = doc?.body?.innerText || '';
        booted = Boolean(doc?.querySelector('app-white-pms-page'));
      } catch {
        return; // cross-origin transitoire pendant la navigation
      }
      // Deux modes d'échec token mort : « OOOPS » affiché, OU app Angular qui ne
      // bootstrappe jamais (iframe blanche, aucun texte, aucune erreur console).
      // ⚠️ PAS « error_occurred_message » : dialogue transitoire RU qui apparaît
      // aussi sur token sain — le traiter comme fatal boucle les rotations.
      const ooops = /OOOPS/i.test(text);
      // 75s : RU peut mettre >30s à bootstrapper quand leur service est lent —
      // un seuil trop court force des rotations inutiles (qui tuent les autres onglets)
      const deadBoot = !booted && Date.now() - startedAt > 75 * 1000;
      if (ooops || deadBoot) {
        reportedRef.current = true;
        clearInterval(timer);
        console.warn('[RU-widget] iframe en échec → demande de refresh forcé', { ooops, deadBoot });
        onWidgetError();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [embedSrc, onWidgetError]);

  if (!embedSrc) return null;

  return (
    <iframe
      ref={iframeRef}
      key={embedSrc}
      src={embedSrc}
      style={{
        width: '100%',
        height: isAdmin ? 'calc(100vh - 200px)' : 'calc(100vh - 70px)',
        border: 'none',
        background: 'white',
      }}
      title="Rental United Channel Manager"
      // No allow-same-origin needed — page is same-origin by src navigation.
      // Keep scripts/forms/popups for RU OTA wizards.
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
};

export default RentalUnitedIframe;
