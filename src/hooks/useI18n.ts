import { useState, useEffect, useCallback } from 'react';
import type { LanguageCode } from '../i18n/types';
import { TRANSLATIONS } from '../i18n/translations';
import { inferDeviceLanguage } from '../utils/language';
import { Storage } from '../services/storage';

export function useI18n() {
  const [language, setLanguageState] = useState<LanguageCode>(() => inferDeviceLanguage());
  
  useEffect(() => {
    async function loadLanguage() {
      const savedLang = await Storage.getLanguage();
      if (savedLang && (savedLang === 'tr' || savedLang === 'en')) {
        setLanguageState(savedLang as LanguageCode);
      }
    }
    void loadLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    await Storage.setLanguage(newLang);
  }, []);
  
  const text = TRANSLATIONS[language];
  
  return {
    language,
    setLanguage,
    text,
  };
}
