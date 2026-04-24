import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { DEFAULT_RECITER_ID, getReciterOption } from '../constants/reciters';
import type { TranslationStrings } from '../i18n/types';
import {
  clearAllSurahAudio,
  downloadAllSurahAudio,
  getAvailableSpaceMB,
  getSurahAudioCacheStats,
} from '../services/surahAudioCache';
import { fetchSurahAudioRefs } from '../services/quranService';

type CacheStats = {
  files: number;
  megabytes: number;
  readySurahs: number;
  totalSurahs: number;
  offlineReady: boolean;
};

const INITIAL_CACHE_STATS: CacheStats = {
  files: 0,
  megabytes: 0,
  readySurahs: 0,
  totalSurahs: 0,
  offlineReady: false,
};

type UseDownloadManagerOptions = {
  isOpen: boolean;
  text: TranslationStrings;
  onError: (message: string | null) => void;
  stopPlayback: () => Promise<void>;
};

export function useDownloadManager({
  isOpen,
  text,
  onError,
  stopPlayback,
}: UseDownloadManagerOptions) {
  const selectedReciter = useMemo(() => getReciterOption(DEFAULT_RECITER_ID), []);
  const [cacheStats, setCacheStats] = useState<CacheStats>(INITIAL_CACHE_STATS);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgressLabel, setDownloadProgressLabel] = useState('');

  const refreshCacheStats = useCallback(async () => {
    const [stats, surahAudios] = await Promise.all([
      getSurahAudioCacheStats(),
      fetchSurahAudioRefs(),
    ]);

    setCacheStats({
      ...stats,
      readySurahs: stats.files,
      totalSurahs: surahAudios.length,
      offlineReady: stats.files >= surahAudios.length,
    });
  }, []);

  useEffect(() => {
    void refreshCacheStats().catch((error) => {
      onError(error instanceof Error ? error.message : String(error));
    });
  }, [onError, refreshCacheStats]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void refreshCacheStats().catch((error) => {
      onError(error instanceof Error ? error.message : String(error));
    });
  }, [isOpen, onError, refreshCacheStats]);

  const downloadAll = useCallback(async () => {
    try {
      const availableSpaceMB = await getAvailableSpaceMB();
      if (availableSpaceMB < 512) {
        onError(text.lowStorageWarning);
        return;
      }

      setIsDownloadingAll(true);
      setDownloadProgressLabel('0%');

      const surahAudios = await fetchSurahAudioRefs();
      await downloadAllSurahAudio(surahAudios, (progress) => {
        setDownloadProgressLabel(`${progress.current}/${progress.total} • ${progress.percent}%`);
      });

      await refreshCacheStats();
      setDownloadProgressLabel(text.downloadCompleteForReciter(selectedReciter.label));
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDownloadingAll(false);
    }
  }, [onError, refreshCacheStats, selectedReciter.label, text]);

  const clearDownloads = useCallback(async () => {
    Alert.alert(text.clearReciterDownloads(selectedReciter.label), text.deleteReciterDownloads(selectedReciter.label), [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.clearReciterDownloads(selectedReciter.label),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await stopPlayback();
            await clearAllSurahAudio();
            await refreshCacheStats();
            setDownloadProgressLabel('');
          })().catch((error) => {
            onError(error instanceof Error ? error.message : String(error));
          });
        },
      },
    ]);
  }, [onError, refreshCacheStats, selectedReciter.label, stopPlayback, text]);

  return {
    selectedReciter,
    cacheStats,
    isDownloadingAll,
    downloadProgressLabel,
    downloadAll,
    clearDownloads,
  };
}
