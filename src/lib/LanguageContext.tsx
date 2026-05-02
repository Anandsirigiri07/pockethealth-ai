import React, { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Language } from './translations';

type LanguageContextType = {
  selectedLanguage: Language;
  setSelectedLanguage: (lang: Language) => void;
  t: typeof translations['English'];
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('English');

  const t = translations[selectedLanguage];

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
