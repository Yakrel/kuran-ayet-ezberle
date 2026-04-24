import { useEffect, useRef } from 'react';
import type { VerseLocation } from '../types/navigation';
import type { PracticeState } from '../utils/appSettings';
import { parsePositiveInt } from '../utils/parsers';

type UsePracticeStatePersistenceOptions = {
  isHydrated: boolean;
  practiceState: PracticeState;
  selectedSurahId: number | null;
  currentPage: number;
  visibleVerseLocation: VerseLocation | null;
  startVerseInput: string;
  endVerseInput: string;
  repeatCountInput: string;
  setStartVerseInput: (value: string) => void;
  setEndVerseInput: (value: string) => void;
  setRepeatCountInput: (value: string) => void;
  setCurrentPage: (page: number) => void;
  setVisibleVerseLocation: (location: VerseLocation | null) => void;
  setPracticeState: (nextPracticeState: PracticeState) => void;
};

export function usePracticeStatePersistence({
  isHydrated,
  practiceState,
  selectedSurahId,
  currentPage,
  visibleVerseLocation,
  startVerseInput,
  endVerseInput,
  repeatCountInput,
  setStartVerseInput,
  setEndVerseInput,
  setRepeatCountInput,
  setCurrentPage,
  setVisibleVerseLocation,
  setPracticeState,
}: UsePracticeStatePersistenceOptions) {
  const hasAppliedInitialPracticeStateRef = useRef(false);

  useEffect(() => {
    if (hasAppliedInitialPracticeStateRef.current || !isHydrated) {
      return;
    }

    hasAppliedInitialPracticeStateRef.current = true;
    setStartVerseInput(String(practiceState.startVerse));
    setEndVerseInput(String(practiceState.endVerse));
    setRepeatCountInput(String(practiceState.repeatCount));
    setCurrentPage(practiceState.page);
    setVisibleVerseLocation(
      practiceState.surahId
        ? {
            surah_id: practiceState.surahId,
            verse_number: practiceState.verseNumber,
            page: practiceState.page,
          }
        : null
    );
  }, [
    isHydrated,
    practiceState,
    setCurrentPage,
    setEndVerseInput,
    setRepeatCountInput,
    setStartVerseInput,
    setVisibleVerseLocation,
  ]);

  useEffect(() => {
    if (!isHydrated || !hasAppliedInitialPracticeStateRef.current) {
      return;
    }

    const startVerse = parsePositiveInt(startVerseInput);
    const endVerse = parsePositiveInt(endVerseInput);
    const repeatCount = parsePositiveInt(repeatCountInput);
    if (startVerse === null || endVerse === null || repeatCount === null) {
      return;
    }

    const nextPracticeState = {
      surahId: visibleVerseLocation ? visibleVerseLocation.surah_id : selectedSurahId,
      verseNumber: visibleVerseLocation ? visibleVerseLocation.verse_number : startVerse,
      page: visibleVerseLocation ? visibleVerseLocation.page : currentPage,
      startVerse,
      endVerse,
      repeatCount,
    };

    const saveTimer = setTimeout(() => {
      setPracticeState(nextPracticeState);
    }, 250);

    return () => {
      clearTimeout(saveTimer);
    };
  }, [
    currentPage,
    endVerseInput,
    isHydrated,
    repeatCountInput,
    selectedSurahId,
    setPracticeState,
    startVerseInput,
    visibleVerseLocation,
  ]);
}
