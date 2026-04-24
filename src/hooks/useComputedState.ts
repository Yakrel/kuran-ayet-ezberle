import { useMemo } from 'react';
import type { SurahDetail, SurahSummary, Verse } from '../types/quran';

export function useComputedState(
  surahDetail: SurahDetail | null,
  currentPage: number,
  surahs: SurahSummary[],
  selectedSurahId: number | null
) {
  // Extract all unique pages from surah detail
  const allPages = useMemo(() => {
    if (!surahDetail?.verses.length) {
      return [];
    }
    const pages = new Set<number>();
    surahDetail.verses.forEach((verse) => pages.add(verse.page));
    return Array.from(pages).sort((a, b) => a - b);
  }, [surahDetail]);

  // Get verses for current page
  const currentPageVerses = useMemo(() => {
    if (!surahDetail) {
      return [];
    }
    return surahDetail.verses.filter((verse) => verse.page === currentPage);
  }, [surahDetail, currentPage]);

  // Calculate current page index
  const currentPageIndex = useMemo(
    () => allPages.findIndex((page) => page === currentPage),
    [allPages, currentPage]
  );

  // Create surah index map for O(1) lookup
  const surahIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    surahs.forEach((surah, idx) => map.set(surah.id, idx));
    return map;
  }, [surahs]);

  // Get current surah index
  const surahIndex = useMemo(
    () => (selectedSurahId === null ? -1 : surahIndexMap.get(selectedSurahId) ?? -1),
    [selectedSurahId, surahIndexMap]
  );

  // Check if navigation is possible
  const canGoPreviousPage = currentPageIndex > 0 || surahIndex > 0;
  const canGoNextPage =
    (currentPageIndex >= 0 && currentPageIndex < allPages.length - 1) ||
    (surahIndex >= 0 && surahIndex < surahs.length - 1);

  return {
    allPages,
    currentPageVerses,
    currentPageIndex,
    surahIndex,
    surahIndexMap,
    canGoPreviousPage,
    canGoNextPage,
  };
}
