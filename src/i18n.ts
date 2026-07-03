import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ruFieldBadgeEn, ruFieldBadgeFr } from './i18n/ruFieldBadge';
import { readSavedUiLanguage } from './utils/userLanguage';

const profileFr = {
  myAccount: 'Mon compte',
  language: 'Langue',
  logout: 'Se déconnecter',
  languageChanged: 'Langue mise à jour',
};

const profileEn = {
  myAccount: 'My account',
  language: 'Language',
  logout: 'Log out',
  languageChanged: 'Language updated',
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: readSavedUiLanguage(),
    fallbackLng: 'fr',
    resources: {
      fr: {
        common: {
          ruFieldBadge: ruFieldBadgeFr,
          profile: profileFr,
        },
      },
      en: {
        common: {
          ruFieldBadge: ruFieldBadgeEn,
          profile: profileEn,
        },
      },
    },
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });
}

export default i18n;
