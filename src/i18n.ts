import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: 'fr',
    fallbackLng: 'fr',
    resources: {
      fr: { common: { translation: {} } },
      en: { common: { translation: {} } },
    },
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });
}

export default i18n;
