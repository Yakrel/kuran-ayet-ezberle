import type { LanguageCode } from '../i18n/types';
import { TRANSLATIONS } from '../i18n/translations';

export function useI18n(language: LanguageCode) {
  return {
    language,
    text: TRANSLATIONS[language],
  };
}
