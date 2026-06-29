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

export function getSelectedCitiesFromOwner(owner) {
  const locs = owner?.fillCompany?.CompanyInfo?.Locations?.Location;
  if (!Array.isArray(locs)) return [];
  return locs.map((loc) => loc?.['@_Id']).filter(Boolean);
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

/** Payload API : ContactInfo miroir (prénom, email…) vient du compte côté backend. */
export function buildFillCompanyApiPayload(fillCompany, selectedCities = []) {
  const src = fillCompany || EMPTY_FILL_COMPANY;
  const contact = { ...(src.ContactInfo || {}) };
  delete contact.FirstName;
  delete contact.LastName;
  delete contact.Email;
  delete contact.Phone;

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
    LegalRepresentativeInfo: src.LegalRepresentativeInfo || {},
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
