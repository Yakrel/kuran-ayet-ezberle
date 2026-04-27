import type { Verse } from '../types/quran';

export function getPageEndVerseNumber(
  verses: Verse[],
  page: number,
  selectedSurahId: number | null
) {
  if (selectedSurahId === null) {
    return null;
  }

  const pageVersesForSurah = verses.filter(
    (verse) => verse.page === page && verse.surah_id === selectedSurahId
  );
  const lastVerse = pageVersesForSurah[pageVersesForSurah.length - 1];

  return lastVerse ? lastVerse.verse_number : null;
}
