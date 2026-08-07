// ════════════════════════════════════════════════════════════════════════════
// TOKENS DE DESIGN — extraits de la maquette Claude Design VALIDÉE
// (« Sojori Pricing v2 (standalone).html », variables CSS :root du fichier).
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ RÈGLE ABSOLUE (agent futur) : ces valeurs sont la SOURCE DE VÉRITÉ visuelle.
// N'écris JAMAIS une couleur en dur dans un composant pricing-v2 (`#eee`,
// `#888`, `#F4CF5E`…) : utilise T.xxx. Si une teinte manque, ajoute-la ICI
// après l'avoir relevée dans la maquette — pas à l'œil.
//
// Relevé au DOM le 2026-08-07 (getComputedStyle sur :root de la maquette).
// ════════════════════════════════════════════════════════════════════════════
export const T = {
  // Fonds & surfaces
  bg: '#F6F5F1', // fond de page (crème Sojori, PAS blanc)
  card: '#FFF',
  line: '#E4E0D6', // bordure de carte (1.5px dans la maquette)
  line2: '#EFECE4', // séparateur interne, plus doux

  // Encre
  ink: '#16130E', // texte principal (presque noir chaud)
  ink2: '#6A6155', // texte secondaire
  mut: '#736B5F', // libellés atténués

  // Or Sojori — 4 valeurs distinctes, ne pas les confondre
  gold: '#B8881A', // or « texte / trait » (lisible sur clair)
  goldPure: '#E6B022', // or saturé (accents forts)
  goldSoft: '#F4CF5E', // or clair (remplissages)
  goldBg: '#FDF6E4', // fond doré très pâle (cartes actives)

  // Statuts
  ok: '#1E5B57',
  okBg: '#E9F2F0',
  warn: '#B8881A',
  warnBg: '#FDF6E4',
  crit: '#C4483A',
  critBg: '#FBF0EE',
  manual: '#2C558F', // bleu « réservé / manuel » du calendrier
  manualBg: '#EDF1F8',

  // Typo
  sans: "'Geist',-apple-system,system-ui,sans-serif",
  mono: "'Geist Mono',ui-monospace,Menlo,monospace",

  // Élévation & géométrie (relevés sur .gcard de la maquette)
  sh: '0 1px 2px rgba(22,19,14,.05)',
  radius: 11, // px — rayon des cartes
  borderW: 1.5, // px — épaisseur de bordure
} as const;

/** Style de carte standard — reproduit `.gcard` de la maquette. */
export const cardSx = {
  bgcolor: T.card,
  border: `${T.borderW}px solid ${T.line}`,
  borderRadius: `${T.radius}px`,
  boxShadow: T.sh,
  p: { xs: 1.75, md: 2.25 },
} as const;

/** Libellé mono en capitales (« 25 COMPARABLES », « PRIX D'APPEL »). */
export const kickerSx = {
  fontFamily: T.mono,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.54px',
  color: T.mut,
} as const;
