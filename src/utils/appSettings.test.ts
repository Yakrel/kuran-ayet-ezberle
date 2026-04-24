import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_PRACTICE_STATE,
  resolveInitialAppSettings,
  resolvePersistedPracticeState,
  resolveTranslationAfterLanguageChange,
} from './appSettings';

describe('resolveInitialAppSettings', () => {
  it('uses explicit defaults only when values have never been persisted', () => {
    const result = resolveInitialAppSettings(
      {
        language: null,
        selectedTranslationAuthorId: null,
        selectedSurahId: null,
        selectedQuranFontId: null,
        themeType: null,
        isAutoScrollEnabled: null,
        practiceState: null,
      },
      'tr'
    );

    expect(result.nextState).toEqual({
      ...DEFAULT_APP_SETTINGS,
      language: 'tr',
      selectedTranslationAuthorId: 6,
      practiceState: DEFAULT_PRACTICE_STATE,
    });
    expect(result.shouldPersistTranslation).toBe(true);
  });

  it('keeps valid persisted settings', () => {
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
    expect(result.nextState.selectedSurahId).toBe(20);
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

  it('throws when a persisted translation does not match the language', () => {
    expect(() =>
      resolveInitialAppSettings(
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
      )
    ).toThrow('Invalid persisted translation');
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

  it('throws on invalid persisted practice values', () => {
    expect(() =>
      resolvePersistedPracticeState({
        surahId: -1,
        verseNumber: 0,
        page: 'abc',
        startVerse: null,
        endVerse: 9.5,
        repeatCount: -3,
      })
    ).toThrow('Invalid persisted practice field');
  });
});

describe('resolveTranslationAfterLanguageChange', () => {
  it('keeps the current translation when it is valid for the next language', () => {
    expect(resolveTranslationAfterLanguageChange(32, 'en')).toBe(32);
  });

  it('selects the explicit language default when the old translation cannot be used', () => {
    expect(resolveTranslationAfterLanguageChange(11, 'en')).toBe(32);
  });
});
