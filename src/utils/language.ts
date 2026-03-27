import * as Localization from 'expo-localization';
import type { LanguageCode } from '../i18n/types';
import { DEFAULT_ENGLISH_AUTHOR_ID, DEFAULT_TURKISH_AUTHOR_ID } from '../constants/defaults';

export function inferDeviceLanguage(): LanguageCode {
  const tag = (Localization.getLocales()[0]?.languageTag ?? '').toLowerCase();
  if (tag.startsWith('tr')) {
    return 'tr';
  }
  return 'en';
}

export function defaultTranslationAuthorByLanguage(language: LanguageCode): number {
  return language === 'tr' ? DEFAULT_TURKISH_AUTHOR_ID : DEFAULT_ENGLISH_AUTHOR_ID;
}
