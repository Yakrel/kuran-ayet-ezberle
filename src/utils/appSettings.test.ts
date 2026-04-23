import { describe, expect, it } from 'vitest';
import {
  resolveInitialAppSettings,
  resolvePersistedPracticeState,
  resolveTranslationAfterLanguageChange,
} from './appSettings';

describe('resolveInitialAppSettings', () => {
  it('keeps a stored translation when it matches the stored language', () => {
    const result = resolveInitialAppSettings(
      {
        language: 'tr',
        selectedTranslationAuthorId: 11,
        selectedSurahId: 2,
        selectedQuranFontId: 'amiri',
        themeType: 'PAPER',
        isAutoScrollEnabled: false,
        practiceState: {
          surahId: 20,
          verseNumber: 10,
          page: 312,
          startVerse: 10,
          endVerse: 40,
          repeatCount: 5,
        },
      },
      'en'
    );

    expect(result.nextState.selectedTranslationAuthorId).toBe(11);
    expect(result.nextState.language).toBe('tr');
    expect(result.nextState.practiceState).toEqual({
      surahId: 20,
      verseNumber: 10,
      page: 312,
      startVerse: 10,
      endVerse: 40,
      repeatCount: 5,
    });
    expect(result.shouldPersistTranslation).toBe(false);
  });

  it('repairs an invalid translation for the chosen language', () => {
    const result = resolveInitialAppSettings(
      {
        language: 'tr',
        selectedTranslationAuthorId: 32,
        selectedSurahId: null,
        selectedQuranFontId: null,
        themeType: null,
        isAutoScrollEnabled: null,
        practiceState: null,
      },
      'en'
    );

    expect(result.nextState.selectedTranslationAuthorId).toBe(6);
    expect(result.shouldPersistTranslation).toBe(true);
  });

  it('uses the persisted practice surah as the active surah', () => {
    const result = resolveInitialAppSettings(
      {
        language: 'tr',
        selectedTranslationAuthorId: 6,
        selectedSurahId: 1,
        selectedQuranFontId: null,
        themeType: null,
        isAutoScrollEnabled: null,
        practiceState: {
          surahId: 36,
          verseNumber: 12,
          page: 441,
          startVerse: 12,
          endVerse: 83,
          repeatCount: 7,
        },
      },
      'en'
    );

    expect(result.nextState.selectedSurahId).toBe(36);
  });
});

describe('resolvePersistedPracticeState', () => {
  it('keeps valid persisted practice values', () => {
    expect(
      resolvePersistedPracticeState({
        surahId: 2,
        verseNumber: 20,
        page: 5,
        startVerse: 20,
        endVerse: 40,
        repeatCount: 10,
      })
    ).toEqual({
      surahId: 2,
      verseNumber: 20,
      page: 5,
      startVerse: 20,
      endVerse: 40,
      repeatCount: 10,
    });
  });

  it('repairs invalid persisted practice values with defaults', () => {
    expect(
      resolvePersistedPracticeState({
        surahId: -1,
        verseNumber: 0,
        page: 'abc',
        startVerse: null,
        endVerse: 9.5,
        repeatCount: -3,
      })
    ).toEqual({
      surahId: null,
      verseNumber: 1,
      page: 1,
      startVerse: 1,
      endVerse: 5,
      repeatCount: 3,
    });
  });
});

describe('resolveTranslationAfterLanguageChange', () => {
  it('keeps the current translation when it is valid for the next language', () => {
    expect(resolveTranslationAfterLanguageChange(32, 'en')).toBe(32);
  });

  it('switches to the new language default when the current translation is invalid', () => {
    expect(resolveTranslationAfterLanguageChange(11, 'en')).toBe(32);
  });
});
