export const EMPTY_FILL_COMPANY_CONTACT = {
  FirstName: '',
  LastName: '',
  Email: '',
  Phone: '',
  City: '',
  CountryId: '',
  Address: '',
  ZipCode: '',
  BirthDate: '',
  LanguageId: '',
  Nationality: '',
  Region: '',
  Area: '',
};

export const EMPTY_FILL_COMPANY_COMPANY = {
  CompanyName: '',
  WebsiteAddress: '',
  CompanyCity: '',
  Address: '',
  CountryId: '',
  PostCode: '',
  PhoneNumber: '',
  VATNumber: '',
  ManagerIdentificationNumber: '',
  MerchantName: '',
  TimeZone: '',
  Region: '',
  Area: '',
  ConfirmationEmail: '',
  NumberOfProperties: '',
  NumberOfEmployees: '',
  YearsInBusiness: '',
  DescribeYourBusiness: '',
  Locations: { Location: [] },
};

export const EMPTY_FILL_COMPANY_LEGAL = {
  FirstName: '',
  LastName: '',
  Email: '',
  City: '',
  CountryOfResidenceId: '',
  Address: '',
  PostCode: '',
  Birthday: '',
  NationalityId: '',
  Region: '',
  Area: '',
};

export const EMPTY_FILL_COMPANY = {
  ContactInfo: { ...EMPTY_FILL_COMPANY_CONTACT },
  CompanyInfo: { ...EMPTY_FILL_COMPANY_COMPANY },
  LegalRepresentativeInfo: { ...EMPTY_FILL_COMPANY_LEGAL },
};

/** Contact effectif (incl. identité miroir depuis l’onglet Compte). */
export function resolveEffectiveContactForLegal(contact = {}, mirror = null) {
  const c = { ...(contact || {}) };
  if (mirror) {
    if (mirror.firstName != null && mirror.firstName !== '') c.FirstName = mirror.firstName;
    if (mirror.lastName != null && mirror.lastName !== '') c.LastName = mirror.lastName;
    if (mirror.email != null && mirror.email !== '') c.Email = mirror.email;
    if (mirror.phone != null && mirror.phone !== '') c.Phone = mirror.phone;
    if (mirror.cityName != null && mirror.cityName !== '') c.City = mirror.cityName;
  }
  return c;
}

/** Mappe ContactInfo → LegalRepresentativeInfo (champs RU). */
export function buildLegalRepresentativeFromContact(contact = {}) {
  const nationality = contact.Nationality ?? contact.NationalityId ?? '';
  return {
    FirstName: contact.FirstName || '',
    LastName: contact.LastName || '',
    Email: contact.Email || '',
    City: contact.City || '',
    CountryOfResidenceId: contact.CountryId || contact.CountryOfResidenceId || '',
    Address: contact.Address || '',
    PostCode: contact.ZipCode || contact.PostCode || '',
    Birthday: contact.BirthDate || contact.Birthday || '',
    NationalityId: nationality,
    Region: contact.Region || '',
    Area: contact.Area || '',
  };
}

/** Copie contact → représentant légal dans Formik. */
export function applyLegalFromContact(setFieldValue, namePrefix, contact, mirror = null) {
  if (typeof setFieldValue !== 'function') return null;
  const eff = resolveEffectiveContactForLegal(contact, mirror);
  const legal = buildLegalRepresentativeFromContact(eff);
  const base = namePrefix ? `${namePrefix}.` : '';
  for (const [key, val] of Object.entries(legal)) {
    setFieldValue(`${base}LegalRepresentativeInfo.${key}`, val);
  }
  return legal;
}

export function isLegalSameAsContact(contact = {}, legal = {}, mirror = null) {
  const expected = buildLegalRepresentativeFromContact(resolveEffectiveContactForLegal(contact, mirror));
  return Object.keys(EMPTY_FILL_COMPANY_LEGAL).every(
    (k) => String(legal[k] ?? '').trim() === String(expected[k] ?? '').trim(),
  );
}

export function getSelectedCitiesFromOwner(owner) {
  const locs = owner?.fillCompany?.CompanyInfo?.Locations?.Location;
  if (!Array.isArray(locs)) return [];
  return locs.map((loc) => String(loc?.['@_Id'] ?? '').trim()).filter(Boolean);
}

/** Libellé Sojori pour un LocationID RU (CompanyInfo.Locations). */
export function resolveRuLocationLabel(locationId, cities = []) {
  if (locationId == null || locationId === '') return '—';
  const id = String(locationId).trim();
  const city = (Array.isArray(cities) ? cities : []).find(
    (c) => String(c.rentalCityId ?? '') === id || String(c._id ?? '') === id,
  );
  return city?.name?.trim() || id;
}

export function buildFillCompanyInitialValues({ owner, cities, account = {} }) {
  const cityId = account.cityId ?? owner?.cityId;
  const ownerCity = Array.isArray(cities) ? cities.find((c) => c._id === cityId) : null;
  const cityName = ownerCity?.name || account.city || owner?.city || '';

  if (owner?.fillCompany) {
    const companyData = owner.fillCompany;
    return {
      ContactInfo: { ...EMPTY_FILL_COMPANY_CONTACT, ...(companyData.ContactInfo || {}) },
      CompanyInfo: {
        ...EMPTY_FILL_COMPANY_COMPANY,
        ...(companyData.CompanyInfo || {}),
        Locations: Array.isArray(companyData.CompanyInfo?.Locations?.Location)
          ? { Location: companyData.CompanyInfo.Locations.Location }
          : { Location: [] },
      },
      LegalRepresentativeInfo: {
        ...EMPTY_FILL_COMPANY_LEGAL,
        ...(companyData.LegalRepresentativeInfo || {}),
      },
    };
  }

  const firstName = account.firstName ?? owner?.firstName ?? '';
  const lastName = account.lastName ?? owner?.lastName ?? '';
  const email = account.email ?? owner?.email ?? '';
  const phone = account.phone ?? owner?.phone ?? '';

  return {
    ContactInfo: {
      ...EMPTY_FILL_COMPANY_CONTACT,
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      Phone: phone,
      City: cityName,
    },
    CompanyInfo: {
      ...EMPTY_FILL_COMPANY_COMPANY,
      CompanyCity: cityName,
      PhoneNumber: phone,
    },
    LegalRepresentativeInfo: { ...EMPTY_FILL_COMPANY_LEGAL },
  };
}

export function resolveAccountCityName({ cityId, cities, fillCompany, owner, account }) {
  const fromList = Array.isArray(cities) ? cities.find((c) => c._id === cityId)?.name : '';
  return (
    fromList ||
    fillCompany?.ContactInfo?.City ||
    fillCompany?.CompanyInfo?.CompanyCity ||
    account?.city ||
    owner?.city ||
    ''
  );
}

/** Applique identité / ville / tél du compte dans fillCompany (source unique UI Compte). */
export function mergeAccountMirrorIntoFillCompany(fillCompany, account, cityName = '') {
  const src = fillCompany || EMPTY_FILL_COMPANY;
  const contact = { ...(src.ContactInfo || {}) };
  const company = { ...(src.CompanyInfo || {}) };

  contact.FirstName = account?.firstName || '';
  contact.LastName = account?.lastName || '';
  contact.Email = account?.email || '';
  contact.Phone = account?.phone || '';
  if (cityName) contact.City = cityName;

  if (cityName) company.CompanyCity = cityName;
  if (account?.phone) company.PhoneNumber = account.phone;

  return {
    ...src,
    ContactInfo: contact,
    CompanyInfo: company,
  };
}

/** Payload API : ContactInfo miroir (prénom, email…) vient du compte côté backend. */
export function buildFillCompanyApiPayload(fillCompany, selectedCities = [], opts = {}) {
  const { keepContactIdentity = false } = opts;
  const src = fillCompany || EMPTY_FILL_COMPANY;
  const contact = { ...(src.ContactInfo || {}) };
  if (!keepContactIdentity) {
    delete contact.FirstName;
    delete contact.LastName;
    delete contact.Email;
    delete contact.Phone;
  }

  return {
    ContactInfo: contact,
    CompanyInfo: {
      ...(src.CompanyInfo || {}),
      Locations: {
        Location: (selectedCities || [])
          .filter(Boolean)
          .map((id) => ({ '@_Id': String(id) })),
      },
    },
    LegalRepresentativeInfo: { ...(src.LegalRepresentativeInfo || {}) },
  };
}

export function hasFillCompanyUserInput(fillCompany) {
  if (!fillCompany) return false;
  const parts = [
    fillCompany.ContactInfo,
    fillCompany.CompanyInfo,
    fillCompany.LegalRepresentativeInfo,
  ];
  return parts.some((block) =>
    Object.entries(block || {}).some(([key, val]) => {
      if (key === 'Locations') return false;
      if (val && typeof val === 'object') return false;
      return String(val ?? '').trim() !== '';
    }),
  );
}

/** Préfère fillCompany API s’il contient des données, sinon celui de la liste PM. */
export function resolveOwnerFillCompany(apiFillCompany, listFillCompany) {
  if (apiFillCompany && hasFillCompanyUserInput(apiFillCompany)) return apiFillCompany;
  if (listFillCompany && hasFillCompanyUserInput(listFillCompany)) return listFillCompany;
  return apiFillCompany ?? listFillCompany ?? undefined;
}

/** Fusionne get-account-by-id avec l’owner de la liste (évite d’effacer fillCompany). */
export function mergeOwnerWithFetchedDetail(listOwner, fetchedAccount) {
  if (!fetchedAccount) return listOwner;
  const fillCompany = resolveOwnerFillCompany(fetchedAccount.fillCompany, listOwner?.fillCompany);
  return {
    ...(listOwner || {}),
    ...fetchedAccount,
    ...(fillCompany != null ? { fillCompany } : {}),
  };
}
