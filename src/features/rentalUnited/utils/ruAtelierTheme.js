/**
 * CSS injecté dans l'iframe Rental United — couleurs / typo Atelier uniquement.
 * Pas de masquage de modules (selectors rp-/ps-/sh-) : le preset showcase peut
 * vider tout le widget alors que le legacy n'injecte que du style léger.
 */

const ATELIER = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primarySoft: '#e6c46a',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  text: '#14110a',
  text2: '#55504a',
  border: 'rgba(20,17,10,0.10)',
};

/** CSS safe — équivalent legacy + touches Sojori (sans display:none sur modules RU). */
export function getRuIframeInjectedCss() {
  return `
/* ── Base (legacy RentalUnitedIframe) ── */
body {
  padding: 6px;
  background: ${ATELIER.bg0};
  color: ${ATELIER.text};
}
#ruApp {
  width: 100%;
  min-height: 400px;
  background: ${ATELIER.bg1};
  border-radius: 12px;
  border: 1px solid ${ATELIER.border};
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

/* ── Sojori Atelier (couleurs uniquement) ── */
button.btn-primary, .btn-primary, .btn-info {
  background: linear-gradient(135deg, ${ATELIER.primary}, ${ATELIER.primaryDeep}) !important;
  border: none !important;
  border-radius: 8px !important;
  color: #fff !important;
  font-weight: 600 !important;
}
button.btn-primary:hover, .btn-primary:hover {
  box-shadow: 0 4px 12px rgba(184, 133, 26, 0.35) !important;
}
a, .text-primary, .nav-tabs > li.active > a {
  color: ${ATELIER.primary} !important;
}
.btn-success, .label-success {
  background: ${ATELIER.primary} !important;
}
.panel, .panel-default, .well {
  border-radius: 12px !important;
  border-color: ${ATELIER.border} !important;
  box-shadow: none !important;
}
.panel-heading {
  background: ${ATELIER.bg0} !important;
  border-radius: 12px 12px 0 0 !important;
}
input, select, textarea, .form-control {
  border-radius: 8px !important;
  border-color: ${ATELIER.border} !important;
}
input:focus, select:focus, .form-control:focus {
  border-color: ${ATELIER.primary} !important;
  box-shadow: 0 0 0 2px rgba(184, 133, 26, 0.15) !important;
}
* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}
`;
}

export { ATELIER };
