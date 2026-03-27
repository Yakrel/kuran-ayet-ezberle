import { useCallback, useRef } from 'react';
import type { SurahSummary, SurahDetail, Verse } from '../types/quran';
import type { VerseLocation } from '../reducers/types';

export function usePageNavigation(
  allPages: number[],
  currentPageIndex: number,
  selectedSurahId: number | null,
  surahDetail: SurahDetail | null,
  surahs: SurahSummary[],
  surahIndex: number,
  currentPage: number,
  setCurrentPage: (page: number) => void,
  setStartVerseInput: (value: string) => void,
  setVisibleVerseLocation: (location: VerseLocation | null) => void,
  setSelectedSurahId: (id: number) => void,
  stopPlayback: () => Promise<void>
) {
  const pendingPageBoundaryRef = useRef<'first' | 'last' | null>(null);

  const goToNextPage = useCallback(() => {
    if (allPages.length === 0 || selectedSurahId === null) {
      return;
    }

    if (currentPageIndex >= 0 && currentPageIndex < allPages.length - 1) {
      const nextPage = allPages[currentPageIndex + 1];
      setCurrentPage(nextPage);
      const firstVerse = surahDetail?.verses.find((verse) => verse.page === nextPage);
      if (firstVerse) {
        setStartVerseInput(String(firstVerse.verse_number));
        setVisibleVerseLocation({
          surah_id: firstVerse.surah_id,
          verse_number: firstVerse.verse_number,
          page: firstVerse.page,
        });
      }
      return;
    }

    if (surahIndex >= 0 && surahIndex < surahs.length - 1) {
      pendingPageBoundaryRef.current = 'first';
      void stopPlayback();
      setSelectedSurahId(surahs[surahIndex + 1].id);
    }
  }, [
    allPages,
    currentPageIndex,
    selectedSurahId,
    surahDetail,
    stopPlayback,
    surahs,
    surahIndex,
    setCurrentPage,
    setStartVerseInput,
    setVisibleVerseLocation,
    setSelectedSurahId,
  ]);

  const goToPreviousPage = useCallback(() => {
    if (allPages.length === 0 || selectedSurahId === null) {
      return;
    }

    if (currentPageIndex > 0) {
      const prevPage = allPages[currentPageIndex - 1];
      setCurrentPage(prevPage);
      const firstVerse = surahDetail?.verses.find((verse) => verse.page === prevPage);
      if (firstVerse) {
        setStartVerseInput(String(firstVerse.verse_number));
        setVisibleVerseLocation({
          surah_id: firstVerse.surah_id,
          verse_number: firstVerse.verse_number,
          page: firstVerse.page,
        });
      }
      return;
    }

    if (surahIndex > 0) {
      pendingPageBoundaryRef.current = 'last';
      void stopPlayback();
      setSelectedSurahId(surahs[surahIndex - 1].id);
    }
  }, [
    allPages,
    currentPageIndex,
    selectedSurahId,
    surahDetail,
    stopPlayback,
    surahs,
    surahIndex,
    setCurrentPage,
    setStartVerseInput,
    setVisibleVerseLocation,
    setSelectedSurahId,
  ]);

  return {
    goToNextPage,
    goToPreviousPage,
    pendingPageBoundaryRef,
  };
}
