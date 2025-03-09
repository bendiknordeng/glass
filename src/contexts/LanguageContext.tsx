import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadTranslations } from '@/i18n';

type Language = 'en' | 'no';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // Initialize with stored language or default to 'en'
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    return (savedLanguage as Language) || 'en';
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { i18n } = useTranslation();

  // Function to change language
  const setLanguage = async (newLanguage: Language) => {
    setIsLoading(true);
    try {
      await loadTranslations(newLanguage);
      setLanguageState(newLanguage);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to set language:', error);
      setIsLoading(false);
    }
  };

  // Initialize translations
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadTranslations(language);
      setIsLoading(false);
    };
    init();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook for using the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};