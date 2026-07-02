import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ruFieldBadgeEn, ruFieldBadgeFr } from './i18n/ruFieldBadge';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: 'fr',
    fallbackLng: 'fr',
    resources: {
      fr: {
        common: {
          ruFieldBadge: ruFieldBadgeFr,
        },
      },
      en: {
        common: {
          ruFieldBadge: ruFieldBadgeEn,
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
