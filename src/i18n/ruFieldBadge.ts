/** i18n strings for Rental United field badges (owner / FillCompany forms). */
export const ruFieldBadgeFr = {
  formLegend: 'Badges champs Rental United',
  formLegendSub:
    'Chaque badge indique si la valeur est envoyée à RU, recopiée depuis le compte Sojori, ou stockée uniquement côté Sojori.',

  ru: 'RU',
  nonRu: 'Sojori',
  sojoriLogin: 'Login Sojori',
  ruCreateUser: 'User RU',
  new: 'Nouveau',
  ruMirror: 'Miroir RU',
  storedOnly: 'Stocké',

  tooltipRu: 'Champ inclus dans Push_FillCompanyDetails vers Rental United.',
  tooltipNonRu: 'Champ Sojori uniquement — non envoyé à Rental United.',
  tooltipSojoriLogin: 'Email de connexion au dashboard Sojori (invitation / mot de passe).',
  tooltipRuCreateUser: 'Email de login extranet RU (Push_CreateUser) — distinct du dashboard.',
  tooltipNew: 'Champ RU récent : libellé Sojori converti en code RU via valueMappings.',
  tooltipRuMirror: 'Recopié depuis le compte owner vers ContactInfo à l’enregistrement.',
  tooltipStoredOnly: 'Stocké dans FillCompany Sojori mais retiré avant le push RU.',

  legendRu: 'Envoyé à Rental United via Push_FillCompanyDetails.',
  legendNonRu: 'Interne Sojori — jamais poussé vers Rental United.',
  legendSojoriLogin: 'Connexion dashboard Sojori ; peut alimenter ContactInfo.Email sur la fiche RU.',
  legendRuCreateUser: 'Création utilisateur extranet RU (Push_CreateUser) — pas d’email Sojori envoyé.',
  legendNew: 'Zone / région / nationalité : texte Sojori mappé vers un code RU (AreaId, RegionId…).',
  legendRuMirror: 'Valeur du compte owner recopiée dans la fiche entreprise RU.',
  legendStoredOnly: 'Conservé en base Sojori uniquement (ex. ConfirmationEmail).',

  hintDashboardEmailCreate:
    'Création du compte dashboard Sojori : invitation par email (24h). Si channel RU, recopié dans ContactInfo.Email (fiche entreprise).',
  hintDashboardEmailEdit:
    'Connexion dashboard Sojori. Recopié dans ContactInfo.Email (fiche RU) à l’enregistrement Entreprise.',
  hintRuEmail:
    'Login sur extranet Rental United (Push_CreateUser) — distinct de l’email dashboard. Aucun email envoyé par Sojori à cette adresse.',

  mappingCodesHint:
    'Libellé Sojori converti en code RU via Hub Channels → Mapping (valueMappings). Sync pays / langues RU pour le référentiel complet.',
  areaHint:
    'Zone ou district (texte libre Sojori) → AreaId RU via valueMappings. Laisser « ** » si inconnu.',
  confirmationEmailHint:
    'Copie interne Sojori (souvent = email dashboard). Jamais envoyée à Rental United.',
  legalNationalityHint:
    'Code pays RU (NationalityId) — pas le libellé texte de ContactInfo.Nationality.',
} as const;

export const ruFieldBadgeEn = {
  formLegend: 'Rental United field badges',
  formLegendSub:
    'Each badge shows whether a value is sent to RU, mirrored from the Sojori account, or stored only in Sojori.',

  ru: 'RU',
  nonRu: 'Sojori',
  sojoriLogin: 'Sojori login',
  ruCreateUser: 'RU user',
  new: 'New',
  ruMirror: 'RU mirror',
  storedOnly: 'Stored',

  tooltipRu: 'Field included in Push_FillCompanyDetails to Rental United.',
  tooltipNonRu: 'Sojori-only field — not sent to Rental United.',
  tooltipSojoriLogin: 'Dashboard login email (invitation / password).',
  tooltipRuCreateUser: 'RU extranet login email (Push_CreateUser) — separate from dashboard.',
  tooltipNew: 'Recent RU field: Sojori label converted to RU code via valueMappings.',
  tooltipRuMirror: 'Copied from owner account to ContactInfo on save.',
  tooltipStoredOnly: 'Stored in Sojori FillCompany but stripped before RU push.',

  legendRu: 'Sent to Rental United via Push_FillCompanyDetails.',
  legendNonRu: 'Sojori internal — never pushed to Rental United.',
  legendSojoriLogin: 'Sojori dashboard login; may feed ContactInfo.Email on the RU company form.',
  legendRuCreateUser: 'RU extranet user creation (Push_CreateUser) — no Sojori email sent.',
  legendNew: 'Area / region / nationality: Sojori text mapped to an RU code (AreaId, RegionId…).',
  legendRuMirror: 'Owner account value copied into the RU company record.',
  legendStoredOnly: 'Kept in Sojori database only (e.g. ConfirmationEmail).',

  hintDashboardEmailCreate:
    'Sojori dashboard account creation: email invitation (24h). If RU channel, copied to ContactInfo.Email (company form).',
  hintDashboardEmailEdit:
    'Sojori dashboard login. Copied to ContactInfo.Email (RU form) when saving company details.',
  hintRuEmail:
    'Rental United extranet login (Push_CreateUser) — separate from dashboard email. Sojori does not email this address.',

  mappingCodesHint:
    'Sojori label converted to RU code via Hub Channels → Mapping (valueMappings). Sync countries / languages for the full catalog.',
  areaHint:
    'Area or district (free Sojori text) → RU AreaId via valueMappings. Use « ** » if unknown.',
  confirmationEmailHint:
    'Internal Sojori copy (often = dashboard email). Never sent to Rental United.',
  legalNationalityHint:
    'RU country code (NationalityId) — not the free-text ContactInfo.Nationality label.',
} as const;
