import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Define a minimal translation resource to satisfy i18next init
const resources = {
  en: {
    translation: {},
  },
};

// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  fallbackLng: "en",
  // react already safes from xss
  interpolation: {
    escapeValue: false,
  },
  lng: "en",
  resources,
});

export default i18n;
