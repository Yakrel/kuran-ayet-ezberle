import type { ThemeType } from '../constants/colors';
import {
  DEFAULT_ENGLISH_AUTHOR_ID,
  DEFAULT_TURKISH_AUTHOR_ID,
} from '../constants/defaults';
import type { QuranFontId } from '../constants/quranFonts';
import { TRANSLATION_OPTIONS } from '../constants/authors';
import type { LanguageCode } from '../i18n/types';
import { DEFAULT_RANGE_SIZE, DEFAULT_REPEAT } from '../constants/defaults';

export type PracticeState = {
  surahId: number | null;
  verseNumber: number;
  page: number;
  startVerse: number;
  endVerse: number;
  repeatCount: number;
};

export type PersistedAppSettings = {
  language: LanguageCode | null;
  selectedTranslationAuthorId: number | null;
  selectedSurahId: number | null;
  selectedQuranFontId: QuranFontId | null;
  themeType: ThemeType | null;
  isAutoScrollEnabled: boolean | null;
  practiceState: unknown;
};

export type AppSettingsState = {
  language: LanguageCode;
  selectedTranslationAuthorId: number;
  selectedSurahId: number | null;
  selectedQuranFontId: QuranFontId;
  themeType: ThemeType;
  isAutoScrollEnabled: boolean;
  practiceState: PracticeState;
};

export const DEFAULT_PRACTICE_STATE: PracticeState = {
  surahId: null,
  verseNumber: 1,
  page: 1,
  startVerse: 1,
  endVerse: DEFAULT_RANGE_SIZE,
  repeatCount: DEFAULT_REPEAT,
};

export const DEFAULT_APP_SETTINGS: AppSettingsState = {
  language: 'en',
  selectedTranslationAuthorId: DEFAULT_ENGLISH_AUTHOR_ID,
  selectedSurahId: null,
  selectedQuranFontId: 'scheherazade',
  themeType: 'DARK',
  isAutoScrollEnabled: true,
  practiceState: DEFAULT_PRACTICE_STATE,
};

export function isTranslationAllowedForLanguage(language: LanguageCode, translationAuthorId: number) {
  return TRANSLATION_OPTIONS.some(
    (option) => option.language === language && option.id === translationAuthorId
  );
}

function getDefaultTranslationAuthorByLanguage(language: LanguageCode) {
  return language === 'tr' ? DEFAULT_TURKISH_AUTHOR_ID : DEFAULT_ENGLISH_AUTHOR_ID;
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

export function resolvePersistedPracticeState(persisted: unknown): PracticeState {
  if (!persisted || typeof persisted !== 'object') {
    return DEFAULT_PRACTICE_STATE;
  }

  const candidate = persisted as Partial<Record<keyof PracticeState, unknown>>;
  const surahId = readPositiveInteger(candidate.surahId, 0);

  return {
    surahId: surahId > 0 ? surahId : null,
    verseNumber: readPositiveInteger(candidate.verseNumber, DEFAULT_PRACTICE_STATE.verseNumber),
    page: readPositiveInteger(candidate.page, DEFAULT_PRACTICE_STATE.page),
    startVerse: readPositiveInteger(candidate.startVerse, DEFAULT_PRACTICE_STATE.startVerse),
    endVerse: readPositiveInteger(candidate.endVerse, DEFAULT_PRACTICE_STATE.endVerse),
    repeatCount: readPositiveInteger(candidate.repeatCount, DEFAULT_PRACTICE_STATE.repeatCount),
  };
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
  const practiceState = resolvePersistedPracticeState(persisted.practiceState);

  const nextState: AppSettingsState = {
    language,
    selectedTranslationAuthorId,
    selectedSurahId: practiceState.surahId ?? persisted.selectedSurahId,
    selectedQuranFontId: persisted.selectedQuranFontId ?? DEFAULT_APP_SETTINGS.selectedQuranFontId,
    themeType: persisted.themeType ?? DEFAULT_APP_SETTINGS.themeType,
    isAutoScrollEnabled: persisted.isAutoScrollEnabled ?? DEFAULT_APP_SETTINGS.isAutoScrollEnabled,
    practiceState,
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
