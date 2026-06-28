import { fetchListingMediaBlob, isListingsBucketUrl } from '../services/listingMediaApi';

const GCS_SRC_RE = /src="(https:\/\/storage\.googleapis\.com[^"]+)"/g;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Lecture image impossible'));
    reader.readAsDataURL(blob);
  });
}

/** Remplace les URLs GCS du HTML par des data-URI (aperçu / PDF sans exposer le bucket). */
export async function sanitizeProfitReportHtmlForDisplay(html: string): Promise<string> {
  const urls = [...new Set([...html.matchAll(GCS_SRC_RE)].map((m) => m[1]).filter(Boolean))];
  if (!urls.length) return html;

  let out = html;
  await Promise.all(
    urls.map(async (canonical) => {
      if (!isListingsBucketUrl(canonical)) return;
      try {
        const blob = await fetchListingMediaBlob(canonical);
        const dataUrl = await blobToDataUrl(blob);
        out = out.split(canonical).join(dataUrl);
      } catch {
        /* garde l’original si lecture impossible */
      }
    }),
  );
  return out;
}

/** Ouvre le HTML du rapport dans un nouvel onglet (blob — pas de pop-up vide). */
export async function openProfitReportHtmlTab(html: string): Promise<void> {
  const safeHtml = await sanitizeProfitReportHtmlForDisplay(html);
  const blob = new Blob([safeHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error('Pop-up bloquée — autorisez les fenêtres pour ce site');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/** Impression / PDF via iframe (évite pop-up vide + noopener). */
export async function printProfitReportHtml(html: string): Promise<void> {
  const safeHtml = await sanitizeProfitReportHtmlForDisplay(html);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Impression rapport P&L');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!doc || !win) {
    iframe.remove();
    throw new Error('Impossible de préparer l’impression');
  }

  doc.open();
  doc.write(safeHtml);
  doc.close();

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  win.onafterprint = cleanup;

  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
      throw new Error('Impression refusée par le navigateur');
    }
    window.setTimeout(cleanup, 120_000);
  }, 350);
}
