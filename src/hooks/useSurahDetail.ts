import { useEffect, useState } from 'react';
import type { ReciterId } from '../constants/reciters';
import { fetchSurahDetail } from '../services/quranService';
import type { SurahDetail } from '../types/quran';

export function useSurahDetail(
  surahId: number | null,
  translationAuthorId: number,
  reciterId: ReciterId,
  loadingSurahDetailError: string
) {
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [isFetchingSurahDetail, setIsFetchingSurahDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (surahId === null) {
      setSurahDetail(null);
      setIsFetchingSurahDetail(false);
      setError(null);
      return;
    }

    const currentSurahId = surahId;
    let isActive = true;

    async function loadSurahDetail(): Promise<void> {
      setSurahDetail(null);
      setIsFetchingSurahDetail(true);
      setError(null);
      try {
        const detail = await fetchSurahDetail(currentSurahId, translationAuthorId, reciterId);
        if (isActive) {
          setSurahDetail(detail);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : loadingSurahDetailError);
        }
      } finally {
        if (isActive) {
          setIsFetchingSurahDetail(false);
        }
      }
    }

    void loadSurahDetail();

    return () => {
      isActive = false;
    };
  }, [surahId, translationAuthorId, reciterId, loadingSurahDetailError]);

  return {
    surahDetail,
    isFetchingSurahDetail,
    error,
  };
}
