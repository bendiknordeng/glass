import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Don't import the translation files directly, 
// we'll load them via HTTP to make dynamic language switching easier
const resources = {
  en: {
    translation: {} // Will be loaded via HTTP
  },
  no: {
    translation: {} // Will be loaded via HTTP
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.VITE_APP_ENV === 'dev',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: true,
    },
  });

// Function to dynamically load translations
export const loadTranslations = async (language: string) => {
  try {
    const translationData = await fetch(`/assets/i18n/${language}.json`);
    const translations = await translationData.json();
    
    i18n.addResourceBundle(language, 'translation', translations, true, true);
    await i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
    
    return true;
  } catch (error) {
    console.error(`Failed to load ${language} translations:`, error);
    return false;
  }
};

// Load initial translations
const currentLanguage = localStorage.getItem('i18nextLng') || 'en';
loadTranslations(currentLanguage);

export default i18n;