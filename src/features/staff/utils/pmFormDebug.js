import {
  computeOwnerActivateReadiness,
  computeOwnerRuProvisionReadiness,
  computeOwnerRuFillCompanyReadiness,
} from './ownerCreateReadiness';

/** Classifie une erreur API PM (admin / interne / RU / route manquante). */
export function classifyPmApiFailure(error, label = '') {
  const status = error?.response?.status;
  const body = error?.response?.data ?? {};
  const msg = String(body?.message || body?.error || error?.message || '').trim();
  const labelL = String(label).toLowerCase();

  if (error?.code === 'SRV_USER_ROUTE_MISSING') {
    return {
      couche: 'srv-user (route non déployée)',
      type: 'ROUTE_ABSENTE',
      message: msg,
      httpStatus: status,
    };
  }
  if (body?.message === 'Service OK' && body?.success !== true) {
    return {
      couche: 'srv-user (health — mauvaise route)',
      type: 'ROUTE_ABSENTE',
      message: 'Réponse health Service OK au lieu de la route métier',
      httpStatus: status,
    };
  }
  if (
    labelL.includes('ru') ||
    msg.includes('[RU]') ||
    msg.includes('Rentals United') ||
    msg.includes('ruOwnerId')
  ) {
    return { couche: 'Rentals United (srv-channels)', type: 'ECHEC_RU', message: msg, httpStatus: status };
  }
  if (status === 401 || status === 403) {
    return { couche: 'Auth admin (JWT / droits)', type: 'AUTH_ADMIN', message: msg, httpStatus: status };
  }
  if (status === 409) {
    return { couche: 'srv-user (conflit métier)', type: 'CONFLIT', message: msg, httpStatus: status };
  }
  if (status === 400) {
    return { couche: 'srv-user (validation)', type: 'VALIDATION', message: msg, httpStatus: status };
  }
  return {
    couche: 'srv-user / réseau',
    type: 'ECHEC_INTERNE',
    message: msg || 'Erreur inconnue',
    httpStatus: status,
  };
}

export function logPmReadiness(action, values) {
  const activate = computeOwnerActivateReadiness(values);
  const ruProvision = computeOwnerRuProvisionReadiness(values);
  const ruFill = computeOwnerRuFillCompanyReadiness(values);
  const ruOn = Boolean(values?.ruEnabled);

  console.group(`[PM-form] Champs requis — action « ${action} »`);
  console.info('RU toggle:', ruOn ? 'OUI' : 'NON');
  console.info(
    '→ Enregistrer / Activer:',
    activate.ready ? '✓ complet' : `✗ manque: ${activate.missing.join(' · ')}`,
  );
  if (ruOn) {
    console.info(
      '→ Créer dans RU (étape 3):',
      ruProvision.ready ? '✓ complet' : `✗ manque: ${ruProvision.missing.join(' · ')}`,
    );
    console.info(
      '→ Créer entreprise RU (étape 4):',
      ruFill.ready ? '✓ complet' : `✗ manque: ${ruFill.missing.join(' · ')}`,
    );
  } else {
    console.info('→ RU: — (toggle désactivé)');
  }
  console.groupEnd();

  return { activate, ruProvision, ruFill, ruOn };
}

export function logPmFormValidationBlocked(action, validationErrors) {
  const keys = Object.keys(validationErrors || {});
  if (!keys.length) return;
  console.warn(`[PM-form] Formulaire bloqué avant « ${action} »`, {
    champsEnErreur: keys,
    detail: validationErrors,
    astuce: 'Corrigez ces champs dans l’onglet Compte (langue, devise, email…).',
  });
}

function summarizeFillCompanyPayload(payload) {
  const list = (obj, filled) => {
    const entries = Object.entries(obj || {}).filter(([k]) => k !== 'Locations');
    return filled
      ? entries.filter(([, v]) => String(v ?? '').trim()).map(([k]) => k)
      : entries.filter(([, v]) => !String(v ?? '').trim()).map(([k]) => k);
  };
  return {
    contactRempli: list(payload?.ContactInfo, true),
    companyRempli: list(payload?.CompanyInfo, true),
    legalRempli: list(payload?.LegalRepresentativeInfo, true),
    companyVide: list(payload?.CompanyInfo, false),
  };
}

export function logPmApiStart(label, requestSummary = {}) {
  console.info(`[PM-api] ▶ ${label}`, requestSummary);
}

export function logPmApiOk(label, response, extra = {}) {
  console.info(`[PM-api] ✓ ${label}`, { response, ...extra });
}

export function logPmApiFail(label, error, extra = {}) {
  const classification = classifyPmApiFailure(error, label);
  console.error(`[PM-api] ✗ ${label}`, {
    classification,
    httpStatus: error?.response?.status,
    body: error?.response?.data,
    message: error?.message,
    ...extra,
  });
  return classification;
}

export function logPersistFillCompany({ ownerId, localOnly, ruEnabled, payload, apiRes, error }) {
  const resume = summarizeFillCompanyPayload(payload);
  const target = localOnly
    ? 'PUT /user/update-fill-company-local (Mongo uniquement)'
    : 'PUT /user/update-fill-company (+ sync RU si ruOwnerId)';

  console.group(`[PM-fillCompany] ${localOnly ? 'LOCAL' : 'LOCAL+RU'} — ${target}`);
  console.info('ownerId:', ownerId, '| RU toggle:', ruEnabled ? 'OUI' : 'NON');
  console.info('Contact rempli:', resume.contactRempli.join(', ') || '(vide)');
  console.info('Société rempli:', resume.companyRempli.join(', ') || '(vide)');
  console.info('Légal rempli:', resume.legalRempli.join(', ') || '(vide)');
  if (error) {
    logPmApiFail('fill-company', error);
  } else {
    console.info('← réponse API:', apiRes);
  }
  console.groupEnd();
}
