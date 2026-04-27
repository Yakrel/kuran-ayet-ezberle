import type { ThemeType } from '../constants/colors';
import {
  DEFAULT_ENGLISH_AUTHOR_ID,
  DEFAULT_TURKISH_AUTHOR_ID,
} from '../constants/defaults';
import type { QuranFontId } from '../constants/quranFonts';
import { DEFAULT_QURAN_FONT_ID, QURAN_FONT_OPTIONS } from '../constants/quranFonts';
import { TRANSLATION_OPTIONS } from '../constants/authors';
import { SURAH_LIST } from '../constants/surahList';
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
  showTranscription: boolean | null;
  practiceState: unknown;
};

export type AppSettingsState = {
  language: LanguageCode;
  selectedTranslationAuthorId: number;
  selectedSurahId: number | null;
  selectedQuranFontId: QuranFontId;
  themeType: ThemeType;
  isAutoScrollEnabled: boolean;
  showTranscription: boolean;
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
  selectedQuranFontId: DEFAULT_QURAN_FONT_ID,
  themeType: 'DARK',
  isAutoScrollEnabled: true,
  showTranscription: true,
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

function readPositiveInteger(value: unknown, fieldName: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid persisted practice field: ${fieldName}.`);
  }

  return value;
}

function assertKnownSurahId(surahId: number, fieldName: string) {
  if (!SURAH_LIST.some((surah) => surah.id === surahId)) {
    throw new Error(`Invalid persisted surah in ${fieldName}: ${surahId}.`);
  }
}

function assertKnownQuranFont(fontId: QuranFontId) {
  if (!QURAN_FONT_OPTIONS.some((option) => option.id === fontId)) {
    throw new Error(`Invalid persisted Quran font: ${fontId}.`);
  }
}

export function resolvePersistedPracticeState(persisted: unknown): PracticeState {
  if (persisted === null) {
    return DEFAULT_PRACTICE_STATE;
  }

  if (typeof persisted !== 'object') {
    throw new Error('Persisted practice state is invalid.');
  }

  const candidate = persisted as Partial<Record<keyof PracticeState, unknown>>;
  const rawSurahId = candidate.surahId;
  const surahId = rawSurahId === null ? null : readPositiveInteger(rawSurahId, 'surahId');
  if (surahId !== null) {
    assertKnownSurahId(surahId, 'practiceState.surahId');
  }

  return {
    surahId,
    verseNumber: readPositiveInteger(candidate.verseNumber, 'verseNumber'),
    page: readPositiveInteger(candidate.page, 'page'),
    startVerse: readPositiveInteger(candidate.startVerse, 'startVerse'),
    endVerse: readPositiveInteger(candidate.endVerse, 'endVerse'),
    repeatCount: readPositiveInteger(candidate.repeatCount, 'repeatCount'),
  };
}

export function resolveInitialAppSettings(
  persisted: PersistedAppSettings,
  initialLanguage: LanguageCode
) {
  const language = persisted.language ?? initialLanguage;
  const selectedTranslationAuthorId = persisted.selectedTranslationAuthorId ?? getDefaultTranslationAuthorByLanguage(language);
  if (!isTranslationAllowedForLanguage(language, selectedTranslationAuthorId)) {
    throw new Error(`Invalid persisted translation ${selectedTranslationAuthorId} for language ${language}.`);
  }

  const practiceState = resolvePersistedPracticeState(persisted.practiceState);
  const selectedSurahId = practiceState.surahId !== null ? practiceState.surahId : persisted.selectedSurahId;
  if (selectedSurahId !== null) {
    assertKnownSurahId(selectedSurahId, 'selectedSurahId');
  }

  const selectedQuranFontId = persisted.selectedQuranFontId ?? DEFAULT_APP_SETTINGS.selectedQuranFontId;
  assertKnownQuranFont(selectedQuranFontId);

  const nextState: AppSettingsState = {
    language,
    selectedTranslationAuthorId,
    selectedSurahId,
    selectedQuranFontId,
    themeType: persisted.themeType ?? DEFAULT_APP_SETTINGS.themeType,
    isAutoScrollEnabled: persisted.isAutoScrollEnabled ?? DEFAULT_APP_SETTINGS.isAutoScrollEnabled,
    showTranscription: persisted.showTranscription ?? DEFAULT_APP_SETTINGS.showTranscription,
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
  if (isTranslationAllowedForLanguage(nextLanguage, currentTranslationAuthorId)) {
    return currentTranslationAuthorId;
  }

  return getDefaultTranslationAuthorByLanguage(nextLanguage);
}
