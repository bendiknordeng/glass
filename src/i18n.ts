import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Function to load translations
const loadTranslationsFile = async (language: string) => {
  try {
    const response = await fetch(`/assets/i18n/${language}.json`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to load ${language} translations:`, error);
    return null;
  }
};

// Initialize i18n after loading initial translations
const initializeI18n = async () => {
  const currentLanguage = localStorage.getItem('i18nextLng') || 'en';
  const baseLanguage = currentLanguage.split('-')[0];
  
  // Load initial translations
  const translations = await loadTranslationsFile(baseLanguage);
  
  const resources = {
    en: {
      translation: baseLanguage === 'en' ? translations : {}
    },
    no: {
      translation: baseLanguage === 'no' ? translations : {}
    }
  };

  await i18n
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
      // Map locale variants to their base languages
      load: 'languageOnly', // This will strip the region code (e.g., 'en-US' -> 'en')
      // Map specific locales to their base language
      nonExplicitSupportedLngs: true,
    });

  return i18n;
};

// Function to dynamically load translations
export const loadTranslations = async (language: string) => {
  try {
    // Strip the region code if present (e.g., convert 'en-US' to 'en')
    const baseLanguage = language.split('-')[0];
    const translations = await loadTranslationsFile(baseLanguage);
    
    if (translations) {
      i18n.addResourceBundle(baseLanguage, 'translation', translations, true, true);
      await i18n.changeLanguage(language);
      localStorage.setItem('i18nextLng', language);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to load ${language} translations:`, error);
    return false;
  }
};

// Export the initialization promise
export const i18nInstance = initializeI18n();

// Export i18n instance for use in components
export default i18n;