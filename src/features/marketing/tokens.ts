// ════════════════════════════════════════════════════════════════════════════
// TOKENS — Marketing Intelligence
// ────────────────────────────────────────────────────────────────────────────
// Repris des tokens pricing-v2 (maquette Claude Design validée) pour que les
// deux modules récents se ressemblent. Même règle : aucune couleur en dur dans
// un composant marketing — si une teinte manque, elle s'ajoute ICI.
// ════════════════════════════════════════════════════════════════════════════
export const T = {
  bg: "#F6F5F1",
  card: "#FFF",
  line: "#E4E0D6",
  line2: "#EFECE4",

  ink: "#16130E",
  ink2: "#6A6155",
  mut: "#736B5F",

  gold: "#B8881A",
  goldPure: "#E6B022",
  goldSoft: "#F4CF5E",
  goldBg: "#FDF6E4",

  ok: "#1E5B57",
  okBg: "#E9F2F0",
  warn: "#B8881A",
  warnBg: "#FDF6E4",
  crit: "#C4483A",
  critBg: "#FBF0EE",

  // Canal de réservation — le direct est ce qu'on cherche à faire monter,
  // l'intermédié est structurellement invisible à la publicité.
  direct: "#1E5B57",
  directBg: "#E9F2F0",
  ota: "#B8881A",
  otaBg: "#FDF6E4",

  mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const cardSx = {
  bgcolor: T.card,
  border: `1.5px solid ${T.line}`,
  borderRadius: "12px",
  p: 2.5,
} as const;

export const kickerSx = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: T.mut,
};
