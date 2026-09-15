// ════════════════════════════════════════════════════════════════════════════
// B2B — POLITIQUE COMMERCIALE D'UN ÉTABLISSEMENT
// ────────────────────────────────────────────────────────────────────────────
// Ce fichier ne contient AUCUN affichage : uniquement les règles. L'écran de
// configuration les présente, l'agent commercial les applique, et le balayage
// d'expiration les relit. Trois lecteurs, une seule définition.
//
// ⚠️ Pourquoi une politique et non des constantes : un acompte de 20 % et un
// devis valable 48 h sont les usages de NOMMOS, pas une loi. Un client qui
// travaille avec des agences réceptives demandera 7 jours ; un resort en haute
// saison refusera de bloquer sans paiement intégral. Coder l'un des deux en dur
// oblige à redéployer pour servir l'autre.
// ════════════════════════════════════════════════════════════════════════════

/** Durée de validité d'un devis, en heures. Liste fermée + valeur libre. */
export const QUOTE_VALIDITY_PRESETS = [
  { hours: 24, label: "24 heures" },
  { hours: 48, label: "48 heures" },
  { hours: 72, label: "72 heures" },
  { hours: 168, label: "7 jours" },
  { hours: 336, label: "14 jours" },
] as const;

/** Ce qu'on exige avant de considérer l'affaire engagée. */
export type DepositMode =
  /** Accord verbal ou écrit, aucun versement. Le bien est bloqué sur confiance. */
  | "none"
  /** Un pourcentage à la commande, le solde plus tard. Le cas courant. */
  | "deposit"
  /** Paiement intégral à la commande. Aucun solde à courir après. */
  | "full";

/** À quel moment le bien cesse d'être vendable ailleurs. */
export type HoldTrigger =
  /** Dès l'envoi du devis — on protège le prospect, on risque la nuit invendue. */
  | "on_quote"
  /** À réception de l'acompte — on ne perd aucune nuit, on peut perdre l'affaire. */
  | "on_deposit";

/** Comment se calcule la date d'échéance du solde. */
export type BalanceDueMode =
  /** Réglé sur place le jour de l'arrivée. */
  | "on_arrival"
  /** X jours après l'encaissement de l'acompte. */
  | "days_after_deposit"
  /** X jours avant la date d'arrivée — le plus sûr commercialement. */
  | "days_before_arrival";

/**
 * Ce que deviennent les réservations quand le devis expire sans acompte.
 *
 * Ce n'est pas une question technique mais commerciale, et elle se règle par
 * PM : `cancel` garde la trace — savoir combien de devis n'aboutissent pas est
 * la seule façon de mesurer si la politique de blocage est bien réglée, et le
 * chemin de libération existe déjà (`CalendarBlock` de type
 * `cancelled_reservation`). `delete` laisse un calendrier propre à ceux que
 * l'historique encombre.
 */
export type OnQuoteExpired = "cancel" | "delete";

/** Que faire du bien quand le solde n'est jamais arrivé. */
export type OnBalanceMissed =
  /** On rouvre à la vente. L'acompte reste acquis ou non, c'est un autre sujet. */
  | "release"
  /** On garde le bien bloqué et on traite au cas par cas. */
  | "keep";

export interface B2bPolicy {
  /* ---- 1. Devis ---- */
  /** Validité en heures. Un devis créé maintenant expire à `now + quoteValidityHours`. */
  quoteValidityHours: number;
  /**
   * Interdit qu'un devis survive à l'arrivée qu'il propose.
   *
   * Sans cette garde, un devis de 7 jours émis pour une arrivée dans 3 jours
   * resterait « valable » alors que le séjour a commencé — le client pourrait
   * l'accepter après coup, et le bien serait bloqué pour une date passée.
   */
  clampValidityToArrival: boolean;

  /* ---- 2. Acompte ---- */
  depositMode: DepositMode;
  /** Pourcentage exigé quand `depositMode === 'deposit'`. */
  depositPercent: number;

  /* ---- 3. Blocage ---- */
  holdTrigger: HoldTrigger;

  /* ---- 4. Solde ---- */
  balanceDueMode: BalanceDueMode;
  /** Nombre de jours, lu selon `balanceDueMode`. Ignoré si `on_arrival`. */
  balanceDueDays: number;

  /* ---- 5. Expiration du devis ---- */
  onQuoteExpired: OnQuoteExpired;

  /* ---- 6. Défaut de paiement ---- */
  onBalanceMissed: OnBalanceMissed;
  /**
   * Jours de tolérance après l'échéance avant d'appliquer `onBalanceMissed`.
   *
   * Un virement international met trois jours ouvrés. Libérer le bien à minuit
   * pile le jour de l'échéance, c'est revendre une chambre déjà payée.
   */
  gracePeriodDays: number;

  /* ---- 7. Relances ---- */
  /**
   * Jours avant échéance où l'on relance, du plus lointain au plus proche.
   *
   * Liste libre : `[7, 2]` relance une semaine puis l'avant-veille. Vide =
   * aucune relance automatique. Un PM qui traite dix comptes les appelle
   * lui-même ; celui qui en traite trois cents ne peut pas.
   */
  reminderDaysBefore: number[];
}

/**
 * Valeurs de départ — celles de NOMMOS, discutées avec Tawfiq.
 *
 * `on_deposit` plutôt que `on_quote` : bloquer sur un devis non payé transforme
 * chaque prospect tiède en nuit invendue. `days_before_arrival` à 30 jours,
 * parce qu'un solde réclamé à l'arrivée n'est plus négociable si le client
 * conteste — il est déjà sur place.
 */
export const DEFAULT_POLICY: B2bPolicy = {
  quoteValidityHours: 48,
  clampValidityToArrival: true,
  depositMode: "deposit",
  depositPercent: 20,
  holdTrigger: "on_deposit",
  balanceDueMode: "days_before_arrival",
  balanceDueDays: 30,
  onQuoteExpired: "cancel",
  onBalanceMissed: "release",
  gracePeriodDays: 3,
  reminderDaysBefore: [7, 2],
};

/** Une incohérence de configuration, formulée pour être lue par le client. */
export interface PolicyWarning {
  field: keyof B2bPolicy;
  severity: "error" | "warn";
  message: string;
}

/**
 * Contrôle de cohérence.
 *
 * Aucune de ces combinaisons ne fait planter le code : elles produisent des
 * situations commerciales absurdes, ce qui est pire — ça passe en production
 * sans bruit et se découvre sur une facture.
 */
export function validatePolicy(p: B2bPolicy): PolicyWarning[] {
  const out: PolicyWarning[] = [];

  // Seule règle qui reste bloquante : une durée nulle ou négative ne décrit
  // aucune situation commerciale, elle ferait expirer le devis avant son envoi.
  if (p.quoteValidityHours < 1) {
    out.push({
      field: "quoteValidityHours",
      severity: "error",
      message:
        "Une validité nulle ferait expirer le devis avant même son envoi. Minimum : une heure.",
    });
  }

  if (p.depositMode === "deposit") {
    if (p.depositPercent <= 0 || p.depositPercent >= 100) {
      out.push({
        field: "depositPercent",
        severity: "warn",
        message:
          "Un acompte se situe habituellement entre 1 et 99 %. Pour exiger la totalité, « paiement intégral » est plus lisible sur le devis.",
      });
    } else if (p.depositPercent < 10) {
      out.push({
        field: "depositPercent",
        severity: "warn",
        message:
          "Sous 10 %, l'acompte ne couvre pas le manque à gagner d'une annulation tardive.",
      });
    }
  }

  if (p.depositMode === "none" && p.holdTrigger === "on_deposit") {
    out.push({
      field: "holdTrigger",
      severity: "warn",
      message:
        "Aucun acompte n'est demandé, mais le blocage attend un versement : le bien ne sera jamais bloqué automatiquement. À ne garder que si la confirmation se fait à la main.",
    });
  }

  if (p.depositMode === "full" && p.balanceDueMode !== "on_arrival") {
    out.push({
      field: "balanceDueMode",
      severity: "warn",
      message:
        "Le paiement est intégral à la commande : il n'y a pas de solde à échelonner.",
    });
  }

  if (p.depositMode !== "full" && p.balanceDueMode !== "on_arrival") {
    if (p.balanceDueDays < 1) {
      out.push({
        field: "balanceDueDays",
        severity: "warn",
        message:
          "Un délai nul rend le solde exigible immédiatement — c'est un paiement intégral déguisé.",
      });
    }
  }

  if (p.holdTrigger === "on_quote" && p.quoteValidityHours >= 168) {
    out.push({
      field: "holdTrigger",
      severity: "warn",
      message:
        "Bloquer dès le devis pour une validité de 7 jours ou plus immobilise le bien une semaine sans contrepartie.",
    });
  }

  if (p.onBalanceMissed === "release" && p.gracePeriodDays < 1) {
    out.push({
      field: "gracePeriodDays",
      severity: "warn",
      message:
        "Sans tolérance, un virement en cours de route fait libérer un bien déjà payé.",
    });
  }

  return out;
}

/** Résumé en une phrase — ce que le client verra en haut de l'écran. */
export function describePolicy(p: B2bPolicy): string {
  const preset = QUOTE_VALIDITY_PRESETS.find(
    (v) => v.hours === p.quoteValidityHours,
  );
  const validity =
    preset?.label ??
    (p.quoteValidityHours >= 48
      ? `${Math.round((p.quoteValidityHours / 24) * 10) / 10} jours`
      : `${p.quoteValidityHours} h`);

  const money =
    p.depositMode === "none"
      ? "sans acompte"
      : p.depositMode === "full"
        ? "payable intégralement"
        : `avec ${p.depositPercent} % d'acompte`;

  const hold =
    p.holdTrigger === "on_quote"
      ? "Le bien est bloqué dès l'envoi"
      : "Le bien est bloqué à réception de l'acompte";

  const balance =
    p.depositMode === "full"
      ? ""
      : p.balanceDueMode === "on_arrival"
        ? ", solde à l'arrivée"
        : p.balanceDueMode === "days_after_deposit"
          ? `, solde ${p.balanceDueDays} jours après l'acompte`
          : `, solde ${p.balanceDueDays} jours avant l'arrivée`;

  return `Devis valable ${validity}, ${money}. ${hold}${balance}.`;
}
