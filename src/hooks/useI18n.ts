import type { LanguageCode } from '../i18n/types';
import { TRANSLATIONS } from '../i18n/translations';
import { inferDeviceLanguage } from '../utils/language';

export function useI18n(language: LanguageCode = inferDeviceLanguage()) {
  return {
    language,
    text: TRANSLATIONS[language],
  };
}
