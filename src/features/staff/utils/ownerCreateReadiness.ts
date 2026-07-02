export interface OwnerCreateReadiness {
  ready: boolean;
  missing: string[];
}

type OwnerFormValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
  ruEmail?: string;
  phone?: string;
  channelManager?: string;
  ruEnabled?: boolean;
  cityId?: string;
  settings?: { language?: string; currency?: string };
  fillCompany?: {
    CompanyInfo?: Record<string, unknown>;
    LegalRepresentativeInfo?: Record<string, unknown>;
  };
};

function isBlank(v: unknown): boolean {
  return !String(v ?? '').trim();
}

/** Champs minimum pour inviter le PM sur le dashboard (sans RU). */
export function computeOwnerActivateReadiness(values: OwnerFormValues): OwnerCreateReadiness {
  const missing: string[] = [];
  if (isBlank(values.firstName)) missing.push('Prénom');
  if (isBlank(values.lastName)) missing.push('Nom');
  if (isBlank(values.email)) missing.push('Email dashboard');
  if (isBlank(values.phone)) missing.push('Téléphone');
  if (isBlank(values.cityId)) missing.push('Ville');
  return { ready: missing.length === 0, missing };
}

/** Enregistrer brouillon (Formik) : compte + langue + devise. */
export function computeOwnerFormSaveReadiness(values: OwnerFormValues): OwnerCreateReadiness {
  const missing = [...computeOwnerActivateReadiness(values).missing];
  if (isBlank(values.settings?.language)) missing.push('Langue');
  if (isBlank(values.settings?.currency)) missing.push('Devise');
  return { ready: missing.length === 0, missing };
}

/** Étape 3 — Push_CreateUser : compte extranet RU (obtenir ruOwnerId). */
export function computeOwnerRuProvisionReadiness(values: OwnerFormValues): OwnerCreateReadiness {
  const missing: string[] = [];
  if (!values.ruEnabled) {
    missing.push('Activer le toggle RU');
    return { ready: false, missing };
  }
  missing.push(...computeOwnerActivateReadiness(values).missing);
  if (isBlank(values.ruEmail)) missing.push('Email R.U.');
  return { ready: missing.length === 0, missing };
}

/** Étape 4 — Push_FillCompanyDetails : entreprise dans RU (après ruOwnerId). */
export function computeOwnerRuFillCompanyReadiness(values: OwnerFormValues): OwnerCreateReadiness {
  const missing: string[] = [];
  if (!values.ruEnabled) {
    missing.push('Activer le toggle RU');
    return { ready: false, missing };
  }

  const company = values.fillCompany?.CompanyInfo || {};
  if (isBlank(company.CompanyName)) missing.push('Nom société (Entreprise RU)');
  if (isBlank(company.VATNumber)) missing.push('N° TVA (Entreprise RU)');
  if (isBlank(company.Address)) missing.push('Adresse société');
  if (isBlank(company.CompanyCity)) missing.push('Ville société');
  if (isBlank(company.CountryId) && isBlank(company.Country)) missing.push('Pays société');
  if (isBlank(company.PhoneNumber)) missing.push('Téléphone société');

  const legal = values.fillCompany?.LegalRepresentativeInfo || {};
  if (isBlank(legal.FirstName)) missing.push('Prénom représentant légal');
  if (isBlank(legal.LastName)) missing.push('Nom représentant légal');
  if (isBlank(legal.Email)) missing.push('Email représentant légal');

  return { ready: missing.length === 0, missing };
}

/** Les deux phases RU (provision + entreprise). */
export function computeOwnerRuSyncReadiness(values: OwnerFormValues): OwnerCreateReadiness {
  const prov = computeOwnerRuProvisionReadiness(values);
  const fill = computeOwnerRuFillCompanyReadiness(values);
  const missing = [...new Set([...prov.missing, ...fill.missing])];
  return { ready: prov.ready && fill.ready, missing };
}

/** @deprecated Préférer activate vs ruProvision vs ruFillCompany selon l’action. */
export function computeOwnerCreateReadiness(values: OwnerFormValues): OwnerCreateReadiness {
  return computeOwnerRuSyncReadiness(values);
}
