/** Spec docs/Menages — config ops ménage v2 sur listing. */

export type CleaningLevel = 'normal' | 'grand';

export type CleaningLevelPrices = {
  durationMinutes: number;
  price: number;
  currency: string;
};

export type MenageOptionPrice = {
  enabled: boolean;
  price: number;
};

export type MenageTrackConfig = {
  enabled: boolean;
  defaultLevel: CleaningLevel;
  normal: CleaningLevelPrices;
  grand: CleaningLevelPrices;
};

export type MenageTrackWithOptions = MenageTrackConfig & {
  options: {
    towels: MenageOptionPrice;
    sheets: MenageOptionPrice;
  };
  /** Par passage (défaut) ou forfait mensuel */
  pricingMode: 'per_passage' | 'monthly_forfait';
  monthlyForfaitAmount: number;
};

export type MenageCheckoutConfig = MenageTrackConfig & {
  pricingMode: 'per_passage' | 'monthly_forfait';
  monthlyForfaitAmount: number;
  options: {
    towels: MenageOptionPrice;
    sheets: MenageOptionPrice;
  };
};

export type MenageFlexibility = {
  /** On peut changer normal ↔ grand (sinon niveau figé = défaut) */
  canChangeLevel: boolean;
  /** FdM peut proposer un changement de niveau */
  fdmCanProposeLevel: boolean;
  /** Proposition FdM nécessite validation superviseur/admin */
  supervisorOrAdminValidates: boolean;
  /** Propriété autorise la FdM à envoyer des images */
  fdmCanSendImages: boolean;
  /** Photos obligatoires (uniquement si fdmCanSendImages) */
  imagesRequired: boolean;
  imagesMax: number;
};

export type MenageOpsConfig = {
  included: MenageTrackWithOptions;
  paid: MenageTrackWithOptions;
  checkout: MenageCheckoutConfig;
  flexibility: MenageFlexibility;
};

function prices(price = 0, durationMinutes = 120): CleaningLevelPrices {
  return { durationMinutes, price, currency: 'MAD' };
}

function optionOff(): MenageOptionPrice {
  return { enabled: false, price: 0 };
}

function track(enabled: boolean): MenageTrackWithOptions {
  return {
    enabled,
    defaultLevel: 'normal',
    normal: prices(),
    grand: prices(),
    options: { towels: optionOff(), sheets: optionOff() },
    pricingMode: 'per_passage',
    monthlyForfaitAmount: 0,
  };
}

export function defaultMenageOps(): MenageOpsConfig {
  return {
    included: track(true),
    paid: track(true),
    checkout: {
      enabled: false,
      defaultLevel: 'normal',
      normal: prices(),
      grand: prices(),
      pricingMode: 'per_passage',
      monthlyForfaitAmount: 0,
      options: { towels: optionOff(), sheets: optionOff() },
    },
    flexibility: {
      canChangeLevel: true,
      fdmCanProposeLevel: true,
      fdmCanSendImages: true,
      imagesRequired: true,
      imagesMax: 10,
      supervisorOrAdminValidates: true,
    },
  };
}

function num(v: unknown, fb: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function bool(v: unknown, fb: boolean): boolean {
  return typeof v === 'boolean' ? v : fb;
}

function normPrices(raw: unknown, fb: CleaningLevelPrices): CleaningLevelPrices {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    durationMinutes: Math.max(15, num(o.durationMinutes, fb.durationMinutes)),
    price: Math.max(0, num(o.price, fb.price)),
    currency: typeof o.currency === 'string' && o.currency ? o.currency : 'MAD',
  };
}

export function normalizeMenageOps(raw: unknown): MenageOpsConfig {
  const base = defaultMenageOps();
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const normTrack = (
    r: unknown,
    fb: MenageTrackWithOptions | MenageCheckoutConfig,
  ): MenageTrackWithOptions => {
    const t = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const opts = (t.options && typeof t.options === 'object' ? t.options : {}) as Record<
      string,
      unknown
    >;
    const opt = (x: unknown, f: MenageOptionPrice): MenageOptionPrice => {
      const z = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
      return { enabled: bool(z.enabled, f.enabled), price: Math.max(0, num(z.price, f.price)) };
    };
    const fbOpts = fb.options ?? { towels: optionOff(), sheets: optionOff() };
    return {
      enabled: bool(t.enabled, fb.enabled),
      defaultLevel: t.defaultLevel === 'grand' ? 'grand' : 'normal',
      normal: normPrices(t.normal, fb.normal),
      grand: normPrices(t.grand, fb.grand),
      options: {
        towels: opt(opts.towels, fbOpts.towels),
        sheets: opt(opts.sheets, fbOpts.sheets),
      },
      pricingMode: t.pricingMode === 'monthly_forfait' ? 'monthly_forfait' : 'per_passage',
      monthlyForfaitAmount: Math.max(0, num(t.monthlyForfaitAmount, fb.monthlyForfaitAmount ?? 0)),
    };
  };

  const flex = (o.flexibility && typeof o.flexibility === 'object' ? o.flexibility : {}) as Record<
    string,
    unknown
  >;

  const included = normTrack(o.included, base.included);
  const paid = normTrack(o.paid, base.paid);
  const checkout = normTrack(o.checkout, base.checkout);

  return {
    included,
    paid,
    checkout: {
      ...checkout,
      pricingMode: checkout.pricingMode,
      monthlyForfaitAmount: checkout.monthlyForfaitAmount,
      options: checkout.options,
    },
    flexibility: {
      canChangeLevel: bool(flex.canChangeLevel, true),
      fdmCanProposeLevel: bool(flex.fdmCanProposeLevel, true),
      fdmCanSendImages: bool(flex.fdmCanSendImages, true),
      imagesRequired: bool(flex.imagesRequired, true),
      imagesMax: Math.min(10, Math.max(1, num(flex.imagesMax, 10))),
      supervisorOrAdminValidates: bool(flex.supervisorOrAdminValidates, true),
    },
  };
}

export function parseMenageOpsFromSources(
  gestion: Record<string, unknown> | undefined,
  listingValues: Record<string, unknown>,
): MenageOpsConfig {
  const fromGestion = gestion?.menageOps;
  const fromListing = listingValues.menageOps;
  return normalizeMenageOps(fromGestion ?? fromListing);
}
