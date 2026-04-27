import { describe, expect, it } from 'vitest';
import type { Verse } from '../types/quran';
import { getPageEndVerseNumber } from './rangeSelection';

function makeVerse(surahId: number, verseNumber: number, page: number): Verse {
  return {
    surah_id: surahId,
    verse_number: verseNumber,
    page,
    verse: `verse ${verseNumber}`,
    transcription: `transcription ${verseNumber}`,
    translation: {
      text: `translation ${verseNumber}`,
    },
    timing: {
      time_from_ms: verseNumber * 1000,
      time_to_ms: verseNumber * 1000 + 500,
      duration_ms: 500,
    },
  };
}

describe('getPageEndVerseNumber', () => {
  it('returns the last visible ayah for the selected surah on the current page', () => {
    expect(
      getPageEndVerseNumber(
        [
          makeVerse(1, 5, 2),
          makeVerse(1, 6, 2),
          makeVerse(2, 1, 2),
        ],
        2,
        1
      )
    ).toBe(6);
  });

  it('does not cross into another surah on mixed pages', () => {
    expect(
      getPageEndVerseNumber(
        [
          makeVerse(1, 7, 1),
          makeVerse(2, 1, 1),
          makeVerse(2, 2, 1),
        ],
        1,
        1
      )
    ).toBe(7);
  });

  it('returns null when no matching selected surah ayah is visible', () => {
    expect(getPageEndVerseNumber([makeVerse(2, 1, 10)], 10, 1)).toBeNull();
    expect(getPageEndVerseNumber([makeVerse(1, 1, 10)], 10, null)).toBeNull();
  });
});
