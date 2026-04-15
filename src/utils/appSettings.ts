import type { ThemeType } from '../constants/colors';
import {
  DEFAULT_ENGLISH_AUTHOR_ID,
  DEFAULT_TURKISH_AUTHOR_ID,
} from '../constants/defaults';
import type { QuranFontId } from '../constants/quranFonts';
import type { ReciterId } from '../constants/reciters';
import { TRANSLATION_OPTIONS } from '../constants/authors';
import type { LanguageCode } from '../i18n/types';

export type PersistedAppSettings = {
  language: LanguageCode | null;
  selectedTranslationAuthorId: number | null;
  selectedSurahId: number | null;
  selectedReciterId: ReciterId | null;
  selectedQuranFontId: QuranFontId | null;
  themeType: ThemeType | null;
  isAutoScrollEnabled: boolean | null;
  isAyahTrackingEnabled: boolean | null;
  lastVerse: { surahId: number; verseNumber: number } | null;
};

export type AppSettingsState = {
  language: LanguageCode;
  selectedTranslationAuthorId: number;
  selectedSurahId: number | null;
  selectedReciterId: ReciterId;
  selectedQuranFontId: QuranFontId;
  themeType: ThemeType;
  isAutoScrollEnabled: boolean;
  isAyahTrackingEnabled: boolean;
  lastVerse: { surahId: number; verseNumber: number } | null;
};

export const DEFAULT_APP_SETTINGS: AppSettingsState = {
  language: 'en',
  selectedTranslationAuthorId: DEFAULT_ENGLISH_AUTHOR_ID,
  selectedSurahId: null,
  selectedReciterId: 'ghamdi',
  selectedQuranFontId: 'scheherazade',
  themeType: 'DARK',
  isAutoScrollEnabled: true,
  isAyahTrackingEnabled: false,
  lastVerse: null,
};

export function isTranslationAllowedForLanguage(language: LanguageCode, translationAuthorId: number) {
  return TRANSLATION_OPTIONS.some(
    (option) => option.language === language && option.id === translationAuthorId
  );
}

function getDefaultTranslationAuthorByLanguage(language: LanguageCode) {
  return language === 'tr' ? DEFAULT_TURKISH_AUTHOR_ID : DEFAULT_ENGLISH_AUTHOR_ID;
}

export function resolveInitialAppSettings(
  persisted: PersistedAppSettings,
  fallbackLanguage: LanguageCode
) {
  const language = persisted.language ?? fallbackLanguage;
  const selectedTranslationAuthorId =
    persisted.selectedTranslationAuthorId !== null &&
    isTranslationAllowedForLanguage(language, persisted.selectedTranslationAuthorId)
      ? persisted.selectedTranslationAuthorId
      : getDefaultTranslationAuthorByLanguage(language);

  const nextState: AppSettingsState = {
    language,
    selectedTranslationAuthorId,
    selectedSurahId: persisted.selectedSurahId,
    selectedReciterId: persisted.selectedReciterId ?? DEFAULT_APP_SETTINGS.selectedReciterId,
    selectedQuranFontId: persisted.selectedQuranFontId ?? DEFAULT_APP_SETTINGS.selectedQuranFontId,
    themeType: persisted.themeType ?? DEFAULT_APP_SETTINGS.themeType,
    isAutoScrollEnabled: persisted.isAutoScrollEnabled ?? DEFAULT_APP_SETTINGS.isAutoScrollEnabled,
    isAyahTrackingEnabled: persisted.isAyahTrackingEnabled ?? DEFAULT_APP_SETTINGS.isAyahTrackingEnabled,
    lastVerse: persisted.lastVerse,
  };

  return {
    nextState,
    shouldPersistTranslation:
      persisted.selectedTranslationAuthorId !== nextState.selectedTranslationAuthorId ||
      persisted.language !== nextState.language,
  };
}

export function resolveTranslationAfterLanguageChange(
  currentTranslationAuthorId: number,
  nextLanguage: LanguageCode
) {
  return isTranslationAllowedForLanguage(nextLanguage, currentTranslationAuthorId)
    ? currentTranslationAuthorId
    : getDefaultTranslationAuthorByLanguage(nextLanguage);
}
