import { useEffect, useState } from 'react';
import { SURAH_LIST } from '../constants/surahList';
import type { SurahSummary } from '../types/quran';

export function useSurahs(loadingSurahsError: string) {
  const [surahs, setSurahs] = useState<SurahSummary[]>(SURAH_LIST);
  const [isFetchingSurahs, setIsFetchingSurahs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Surah list is now local, no need to fetch
    setSurahs(SURAH_LIST);
  }, []);

  return {
    surahs,
    isFetchingSurahs,
    error,
  };
}
