import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  resolveInitialAppSettings,
  resolveTranslationAfterLanguageChange,
} from './appSettings';

describe('resolveInitialAppSettings', () => {
  it('keeps a stored translation when it matches the stored language', () => {
    const result = resolveInitialAppSettings(
      {
        language: 'tr',
        selectedTranslationAuthorId: 11,
        selectedSurahId: 2,
        selectedReciterId: 'maher',
        selectedQuranFontId: 'amiri',
        themeType: 'PAPER',
        isAutoScrollEnabled: false,
        isAyahTrackingEnabled: true,
        lastVerse: { surahId: 2, verseNumber: 5 },
      },
      'en'
    );

    expect(result.nextState.selectedTranslationAuthorId).toBe(11);
    expect(result.nextState.language).toBe('tr');
    expect(result.shouldPersistTranslation).toBe(false);
  });

  it('repairs an invalid translation for the chosen language', () => {
    const result = resolveInitialAppSettings(
      {
        language: 'tr',
        selectedTranslationAuthorId: 32,
        selectedSurahId: null,
        selectedReciterId: null,
        selectedQuranFontId: null,
        themeType: null,
        isAutoScrollEnabled: null,
        isAyahTrackingEnabled: null,
        lastVerse: null,
      },
      'en'
    );

    expect(result.nextState.selectedTranslationAuthorId).toBe(6);
    expect(result.nextState.selectedReciterId).toBe(DEFAULT_APP_SETTINGS.selectedReciterId);
    expect(result.shouldPersistTranslation).toBe(true);
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
