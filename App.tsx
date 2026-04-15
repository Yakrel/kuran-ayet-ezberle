import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  ActivityIndicator,
  AppState,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Amiri_400Regular } from '@expo-google-fonts/amiri';
import { Lateef_400Regular } from '@expo-google-fonts/lateef';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';

import { CompactHeader } from './src/components/CompactHeader';
import { AboutSheet } from './src/components/AboutSheet';
import { DownloadManagerSheet } from './src/components/DownloadManagerSheet';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ErrorCard } from './src/components/ErrorCard';
import { SettingsSheet } from './src/components/SettingsSheet';
import { VerseList } from './src/components/VerseList';
import { TRANSLATION_OPTIONS } from './src/constants/authors';
import { DEFAULT_RECITER_ID, RECITER_OPTIONS, getReciterOption, type ReciterId } from './src/constants/reciters';
import { hasEmbeddedTracking } from './src/constants/reciters';
import {
  APP_VERSION,
  DEFAULT_RANGE_SIZE,
  DEFAULT_REPEAT,
  DEVELOPER_NAME,
  TOTAL_QURAN_PAGES,
} from './src/constants/defaults';
import { SURAH_LIST } from './src/constants/surahList';
import {
  QURAN_FONT_OPTIONS,
  QURAN_FONT_PREVIEW_TEXT,
} from './src/constants/quranFonts';
import { useAppSettings } from './src/hooks/useAppSettings';
import { useComputedState } from './src/hooks/useComputedState';
import { useI18n } from './src/hooks/useI18n';
import { useSegmentedPlayer } from './src/hooks/useSegmentedPlayer';
import { useSurahDetail } from './src/hooks/useSurahDetail';
import { useSwipeGesture } from './src/hooks/useSwipeGesture';
import {
  clearAllDownloads,
  downloadAudioBundle,
  getAvailableSpaceMB,
  getCacheStats,
  initializeAudioCache,
} from './src/services/audioCache';
import { clearAllSurahAudio } from './src/services/surahAudioCache';
import { fetchPageVerses } from './src/services/quranService';
import { commonStyles } from './src/styles/common';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import type { Verse } from './src/types/quran';
import { parsePositiveInt, parseSurahId } from './src/utils/parsers';

void SplashScreen.preventAutoHideAsync();

type PendingNavigationIntent =
  | {
      type: 'jump_to_verse';
      surahId: number;
      verseNumber: number;
      syncRange: boolean;
    }
  | {
      type: 'boundary';
      surahId: number;
      boundary: 'first' | 'last';
      syncRange: boolean;
    };

type MainAppProps = {
  settings: ReturnType<typeof useAppSettings>;
};

function MainApp({ settings }: MainAppProps) {
  const [fontsLoaded] = useFonts({
    Amiri_400Regular,
    Lateef_400Regular,
    NotoNaskhArabic_400Regular,
    ScheherazadeNew_400Regular,
  });

  const {
    isHydrated,
    language,
    selectedSurahId,
    selectedTranslationAuthorId,
    selectedReciterId,
    selectedQuranFontId,
    isAutoScrollEnabled,
    isAyahTrackingEnabled,
    themeType,
    lastVerse,
    setLanguage,
    setSelectedSurahId,
    setSelectedTranslationAuthorId,
    setSelectedReciterId,
    setSelectedQuranFontId,
    setThemeType,
    setIsAutoScrollEnabled,
    setIsAyahTrackingEnabled,
    setLastVerse,
  } = settings;
  const { text } = useI18n(language);
  const [startVerseInput, setStartVerseInput] = useState('1');
  const [endVerseInput, setEndVerseInput] = useState(String(DEFAULT_RANGE_SIZE));
  const [repeatCountInput, setRepeatCountInput] = useState(String(DEFAULT_REPEAT));
  const [currentPageInput, setCurrentPageInput] = useState('1');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleVerseLocation, setVisibleVerseLocation] = useState<{
    surah_id: number;
    verse_number: number;
    page: number;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState({ files: 0, megabytes: 0, readyVerses: 0, totalVerses: 0, offlineReady: false });
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgressLabel, setDownloadProgressLabel] = useState('');

  const pendingNavigationIntentRef = useRef<PendingNavigationIntent | null>(null);
  const restoredLastVerseRef = useRef(false);
  const previousReciterIdRef = useRef<ReciterId | null>(null);
  const surahs = SURAH_LIST;
  const isFetchingSurahs = false;
  const { surahDetail, isFetchingSurahDetail, isFetchingInitial, error: surahDetailError } = useSurahDetail(
    selectedSurahId,
    selectedTranslationAuthorId,
    selectedReciterId,
    text.loadingSurahDetailError
  );

  const computed = useComputedState(surahDetail, currentPage, surahs, selectedSurahId);

  const selectedQuranFont = useMemo(
    () => QURAN_FONT_OPTIONS.find((option) => option.id === selectedQuranFontId) ?? QURAN_FONT_OPTIONS[0],
    [selectedQuranFontId]
  );

  const translationOptionsForLanguage = useMemo(
    () => TRANSLATION_OPTIONS.filter((option) => option.language === language),
    [language]
  );

  const handleActiveVerseChange = useCallback((verse: Verse | null) => {
    if (!isAyahTrackingEnabled || !verse) {
      return;
    }

    setVisibleVerseLocation((previousLocation) => {
      if (
        previousLocation?.surah_id === verse.surah_id &&
        previousLocation?.verse_number === verse.verse_number &&
        previousLocation?.page === verse.page
      ) {
        return previousLocation;
      }

      return {
        surah_id: verse.surah_id,
        verse_number: verse.verse_number,
        page: verse.page,
      };
    });

    if (verse.surah_id === selectedSurahId && verse.page !== currentPage) {
      setCurrentPage(verse.page);
    }
    setLastVerse(verse.surah_id, verse.verse_number);
  }, [currentPage, isAyahTrackingEnabled, selectedSurahId, setLastVerse]);

  const player = useSegmentedPlayer({
    reciterId: selectedReciterId,
    onError: setErrorMessage,
    onActiveVerseChange: handleActiveVerseChange,
  });
  const currentPlayingVerse = player.activeVerse;
  const selectedReciter = useMemo(() => getReciterOption(selectedReciterId), [selectedReciterId]);
  const ayahTrackingAvailable = useMemo(() => hasEmbeddedTracking(selectedReciterId), [selectedReciterId]);

  const logUiEvent = useCallback((_step: string, _payload?: Record<string, unknown>) => {
    // Diagnostics removed.
  }, []);

  const getCurrentRangeSize = useCallback(() => {
    const startVerse = parsePositiveInt(startVerseInput) ?? 1;
    const endVerse = parsePositiveInt(endVerseInput) ?? startVerse;
    return Math.max(endVerse - startVerse, 0);
  }, [endVerseInput, startVerseInput]);

  const applyViewportToVerse = useCallback((verse: Verse) => {
    setCurrentPage((previousPage) => (previousPage === verse.page ? previousPage : verse.page));
    setVisibleVerseLocation((previousLocation) => {
      if (
        previousLocation?.surah_id === verse.surah_id &&
        previousLocation?.verse_number === verse.verse_number &&
        previousLocation?.page === verse.page
      ) {
        return previousLocation;
      }

      return {
        surah_id: verse.surah_id,
        verse_number: verse.verse_number,
        page: verse.page,
      };
    });
  }, []);

  const syncRangeFromAnchor = useCallback((anchorVerseNumber: number, verseCount: number) => {
    const rangeSize = getCurrentRangeSize();
    const nextStartVerse = Math.min(Math.max(anchorVerseNumber, 1), verseCount);
    const nextEndVerse = Math.min(nextStartVerse + rangeSize, verseCount);
    setStartVerseInput((previousValue) => (previousValue === String(nextStartVerse) ? previousValue : String(nextStartVerse)));
    setEndVerseInput((previousValue) => (previousValue === String(nextEndVerse) ? previousValue : String(nextEndVerse)));
    return {
      startVerse: nextStartVerse,
      endVerse: nextEndVerse,
    };
  }, [getCurrentRangeSize]);

  useEffect(() => {
    void initializeAudioCache(DEFAULT_RECITER_ID);
  }, []);

  useEffect(() => {
    void (async () => {
      await initializeAudioCache(selectedReciterId);
      setCacheStats(await getCacheStats(selectedReciterId));
    })();
  }, [selectedReciterId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        void player.stopPlayback();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player.stopPlayback]);

  useEffect(() => {
    const normalizedCurrentPage = Math.max(1, currentPage);
    if (normalizedCurrentPage !== currentPage) {
      setCurrentPage(normalizedCurrentPage);
      return;
    }

    setCurrentPageInput(String(normalizedCurrentPage));
  }, [currentPage]);

  useEffect(() => {
    if (!ayahTrackingAvailable && isAyahTrackingEnabled) {
      setIsAyahTrackingEnabled(false);
    }
  }, [ayahTrackingAvailable, isAyahTrackingEnabled]);

  const { theme } = useTheme();

  useEffect(() => {
    if (surahs.length > 0 && selectedSurahId === null) {
      setSelectedSurahId(surahs[0].id);
    }
  }, [selectedSurahId, surahs]);

  useEffect(() => {
    if (surahDetailError) {
      setErrorMessage(surahDetailError);
    }
  }, [surahDetailError]);

  useEffect(() => {
    if (fontsLoaded && isHydrated) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      previousReciterIdRef.current = selectedReciterId;
      return;
    }

    const previousReciterId = previousReciterIdRef.current;
    previousReciterIdRef.current = selectedReciterId;

    if (previousReciterId && previousReciterId !== selectedReciterId) {
      logUiEvent('ui_reciter_changed', {
        from: previousReciterId,
        to: selectedReciterId,
        playbackStatus: player.playbackStatus,
      });
      void player.stopPlayback();
    }
  }, [isHydrated, logUiEvent, player.playbackStatus, player.stopPlayback, selectedReciterId]);

  useEffect(() => {
    if (!isDownloadManagerOpen) {
      return;
    }

    void (async () => {
      setCacheStats(await getCacheStats(selectedReciterId));
    })();
  }, [isDownloadManagerOpen, selectedReciterId]);

  useEffect(() => {
    if (restoredLastVerseRef.current || !isHydrated || !lastVerse || !isAyahTrackingEnabled) {
      return;
    }

    restoredLastVerseRef.current = true;
    pendingNavigationIntentRef.current = {
      type: 'jump_to_verse',
      surahId: lastVerse.surahId,
      verseNumber: lastVerse.verseNumber,
      syncRange: true,
    };
  }, [isAyahTrackingEnabled, isHydrated, lastVerse]);

  useEffect(() => {
    if (!surahDetail) {
      return;
    }

    const pendingIntent = pendingNavigationIntentRef.current;
    let targetVerse: Verse | null = null;

    if (pendingIntent?.surahId === surahDetail.id) {
      if (pendingIntent.type === 'jump_to_verse') {
        targetVerse = surahDetail.verses.find((verse) => verse.verse_number === pendingIntent.verseNumber) ?? null;
      } else {
        targetVerse =
          pendingIntent.boundary === 'first'
            ? (surahDetail.verses[0] ?? null)
            : (surahDetail.verses[surahDetail.verses.length - 1] ?? null);
      }
    } else if (visibleVerseLocation?.surah_id === surahDetail.id) {
      targetVerse =
        surahDetail.verses.find((verse) => verse.verse_number === visibleVerseLocation.verse_number) ?? null;
    } else if (computed.currentPageVerses.length > 0) {
      targetVerse = computed.currentPageVerses[0] ?? null;
    } else {
      targetVerse = surahDetail.verses[0] ?? null;
    }

    if (!targetVerse) {
      return;
    }

    applyViewportToVerse(targetVerse);

    if (pendingIntent?.surahId === surahDetail.id && pendingIntent.syncRange) {
      syncRangeFromAnchor(targetVerse.verse_number, surahDetail.verse_count);
      pendingNavigationIntentRef.current = null;
      return;
    }

    pendingNavigationIntentRef.current = null;

    const currentStartVerse = parsePositiveInt(startVerseInput);
    const currentEndVerse = parsePositiveInt(endVerseInput);
    if (currentStartVerse === null || currentEndVerse === null) {
      syncRangeFromAnchor(targetVerse.verse_number, surahDetail.verse_count);
      return;
    }

    if (currentStartVerse > surahDetail.verse_count) {
      syncRangeFromAnchor(targetVerse.verse_number, surahDetail.verse_count);
      return;
    }

    if (currentEndVerse > surahDetail.verse_count) {
      setEndVerseInput(String(surahDetail.verse_count));
    }
  }, [
    applyViewportToVerse,
    computed.currentPageVerses,
    endVerseInput,
    startVerseInput,
    surahDetail,
    syncRangeFromAnchor,
    visibleVerseLocation,
  ]);

  const getReadySurahDetail = useCallback(() => {
    if (isFetchingSurahDetail || !surahDetail) {
      throw new Error(text.surahNotReady);
    }

    if (selectedSurahId !== null && surahDetail.id !== selectedSurahId) {
      throw new Error(text.surahNotReady);
    }

    return surahDetail;
  }, [isFetchingSurahDetail, selectedSurahId, surahDetail, text.surahNotReady]);

  const resolveRangeForSurah = useCallback((detail: typeof surahDetail, overrideStartVerse?: number) => {
    if (!detail) {
      throw new Error(text.surahNotReady);
    }

    const startVerse = overrideStartVerse ?? parsePositiveInt(startVerseInput);
    const requestedEndVerse = parsePositiveInt(endVerseInput);
    const repeatCount = parsePositiveInt(repeatCountInput);

    if (startVerse === null || requestedEndVerse === null || repeatCount === null) {
      throw new Error(text.rangeInputError);
    }
    if (startVerse > detail.verse_count) {
      throw new Error(text.verseOutOfRange(detail.verse_count));
    }
    if (requestedEndVerse < startVerse) {
      throw new Error(text.rangeInputError);
    }

    const endVerse = Math.min(detail.verse_count, requestedEndVerse);
    return { startVerse, endVerse, repeatCount };
  }, [endVerseInput, repeatCountInput, startVerseInput, text]);

  const handleStartPlayback = async (overrideStartVerse?: number) => {
    try {
      const readySurahDetail = getReadySurahDetail();

      const { startVerse, endVerse, repeatCount } = resolveRangeForSurah(readySurahDetail, overrideStartVerse);
      setErrorMessage(null);
      setStartVerseInput(String(startVerse));
      setEndVerseInput(String(endVerse));
      logUiEvent('ui_start_playback', {
        surahId: readySurahDetail.id,
        page: currentPage,
        startVerse,
        endVerse,
        repeatCount,
        reciterId: selectedReciterId,
      });
      await player.startPlayback({
        reciterId: selectedReciterId,
        surahDetail: readySurahDetail,
        startVerseNumber: startVerse,
        endVerseNumber: endVerse,
        repeatCount,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.startingPlaybackError);
    }
  };

  const goToAdjacentPage = useCallback((direction: 'next' | 'previous') => {
    if (computed.allPages.length === 0 || selectedSurahId === null) {
      return;
    }

    const nextPageIndex =
      direction === 'next' ? computed.currentPageIndex + 1 : computed.currentPageIndex - 1;

    if (nextPageIndex >= 0 && nextPageIndex < computed.allPages.length) {
      const nextPage = computed.allPages[nextPageIndex];
      const firstVerse = surahDetail?.verses.find((verse) => verse.page === nextPage);
      if (!firstVerse || !surahDetail) {
        return;
      }

      applyViewportToVerse(firstVerse);
      syncRangeFromAnchor(firstVerse.verse_number, surahDetail.verse_count);
      logUiEvent('ui_page_changed_same_surah', {
        direction,
        page: nextPage,
        surahId: firstVerse.surah_id,
        verseNumber: firstVerse.verse_number,
        playbackStatus: player.playbackStatus,
      });
      return;
    }

    const targetSurahIndex = direction === 'next' ? computed.surahIndex + 1 : computed.surahIndex - 1;
    if (targetSurahIndex < 0 || targetSurahIndex >= surahs.length) {
      return;
    }

    const targetSurahId = surahs[targetSurahIndex].id;
    pendingNavigationIntentRef.current = {
      type: 'boundary',
      surahId: targetSurahId,
      boundary: direction === 'next' ? 'first' : 'last',
      syncRange: true,
    };
    setSelectedSurahId(targetSurahId);
    logUiEvent('ui_page_changed_cross_surah', {
      direction,
      targetSurahId,
      playbackStatus: player.playbackStatus,
    });
  }, [
    applyViewportToVerse,
    computed.allPages,
    computed.currentPageIndex,
    computed.surahIndex,
    logUiEvent,
    player.playbackStatus,
    selectedSurahId,
    setSelectedSurahId,
    surahDetail,
    surahs,
    syncRangeFromAnchor,
  ]);

  const pageSwipeResponder = useSwipeGesture(
    () => goToAdjacentPage('next'),
    () => goToAdjacentPage('previous')
  );

  const handleSurahChange = async (nextSurahId: number | string) => {
    const normalizedSurahId = parseSurahId(nextSurahId);
    if (normalizedSurahId === null) {
      setErrorMessage(text.invalidSurahSelection);
      return;
    }

    pendingNavigationIntentRef.current = {
      type: 'boundary',
      surahId: normalizedSurahId,
      boundary: 'first',
      syncRange: true,
    };
    await player.stopPlayback();
    setSelectedSurahId(normalizedSurahId);
    logUiEvent('ui_surah_changed', {
      surahId: normalizedSurahId,
      playbackStatus: player.playbackStatus,
    });
  };

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > TOTAL_QURAN_PAGES) {
      return;
    }

    const currentSurahVerse = surahDetail?.verses.find((verse) => verse.page === page);
    if (currentSurahVerse && surahDetail) {
      applyViewportToVerse(currentSurahVerse);
      syncRangeFromAnchor(currentSurahVerse.verse_number, surahDetail.verse_count);
      logUiEvent('ui_page_input_same_surah', {
        page,
        surahId: currentSurahVerse.surah_id,
        verseNumber: currentSurahVerse.verse_number,
        playbackStatus: player.playbackStatus,
      });
      return;
    }

    const pageVerses = await fetchPageVerses(page, selectedTranslationAuthorId, selectedReciterId);
    const firstVerse = pageVerses[0];
    if (!firstVerse) {
      return;
    }

    pendingNavigationIntentRef.current = {
      type: 'jump_to_verse',
      surahId: firstVerse.surah_id,
      verseNumber: firstVerse.verse_number,
      syncRange: true,
    };
    setSelectedSurahId(firstVerse.surah_id);
    logUiEvent('ui_page_input_cross_surah', {
      page,
      surahId: firstVerse.surah_id,
      verseNumber: firstVerse.verse_number,
      playbackStatus: player.playbackStatus,
    });
  };

  const handlePageInputSubmit = async () => {
    const parsedPage = parsePositiveInt(currentPageInput);
    if (parsedPage === null) {
      setCurrentPageInput(String(currentPage));
      return;
    }

    const nextPage = parsedPage;
    if (nextPage < 1 || nextPage > TOTAL_QURAN_PAGES) {
      setCurrentPageInput(String(currentPage));
      return;
    }

    await handlePageChange(nextPage);
  };

  const handleTranslationChange = useCallback((nextAuthorId: number) => {
    setSelectedTranslationAuthorId(nextAuthorId);
    logUiEvent('ui_translation_changed', {
      translationAuthorId: nextAuthorId,
      selectedSurahId,
      currentPage,
    });
  }, [currentPage, logUiEvent, selectedSurahId]);

  const handleReciterChange = useCallback((nextReciterId: ReciterId) => {
    setSelectedReciterId(nextReciterId);
  }, []);

  const handleVerseTap = async (verse: Verse) => {
    try {
      applyViewportToVerse(verse);
      const readySurahDetail = getReadySurahDetail();
      const { startVerse, endVerse } = syncRangeFromAnchor(verse.verse_number, readySurahDetail.verse_count);
      const repeatCount = parsePositiveInt(repeatCountInput) ?? 1;
      setErrorMessage(null);
      logUiEvent('ui_verse_tapped', {
        surahId: verse.surah_id,
        page: verse.page,
        verseNumber: verse.verse_number,
        playbackStatus: player.playbackStatus,
        repeatCount,
      });

      await player.startPlayback({
        reciterId: selectedReciterId,
        surahDetail: readySurahDetail,
        startVerseNumber: startVerse,
        endVerseNumber: endVerse,
        repeatCount,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.startingPlaybackError);
    }
  };

  const handleVerseLongPress = useCallback((verse: Verse) => {
    if (!surahDetail) {
      return;
    }

    applyViewportToVerse(verse);
    syncRangeFromAnchor(verse.verse_number, surahDetail.verse_count);
    setErrorMessage(null);
    logUiEvent('ui_verse_long_pressed', {
      surahId: verse.surah_id,
      page: verse.page,
      verseNumber: verse.verse_number,
      playbackStatus: player.playbackStatus,
    });
  }, [applyViewportToVerse, logUiEvent, player.playbackStatus, surahDetail, syncRangeFromAnchor]);

  const handleDownloadAll = async () => {
    try {
      const availableSpaceMB = await getAvailableSpaceMB();
      if (availableSpaceMB < 512) {
        setErrorMessage(text.lowStorageWarning);
        return;
      }

      setIsDownloadingAll(true);
      setDownloadProgressLabel('0%');

      await downloadAudioBundle(selectedReciterId, (progress) => {
        setDownloadProgressLabel(`${progress.current}/${progress.total} • ${progress.percent}%`);
      });

      setCacheStats(await getCacheStats(selectedReciterId));
      setDownloadProgressLabel(text.downloadCompleteForReciter(selectedReciter.label));
    } catch (error) {
      if (error instanceof Error && error.message === 'download_cancelled') {
        setDownloadProgressLabel('');
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : text.downloadError);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleClearDownloads = async () => {
    Alert.alert(text.clearReciterDownloads(selectedReciter.label), text.deleteReciterDownloads(selectedReciter.label), [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.clearReciterDownloads(selectedReciter.label),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await player.stopPlayback();
            await clearAllDownloads(selectedReciterId);
            await clearAllSurahAudio();
            setCacheStats(await getCacheStats(selectedReciterId));
            setDownloadProgressLabel('');
          })();
        },
      },
    ]);
  };

  const currentVerse = currentPlayingVerse;

  if (!fontsLoaded || !isHydrated) {
    return null;
  }

  return (
    <SafeAreaView style={[commonStyles.safeArea, { backgroundColor: theme.colors.PRIMARY_BG }]}>
      <View style={[styles.backgroundGlowTop, { backgroundColor: themeType === 'DARK' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(42, 161, 152, 0.08)' }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: themeType === 'DARK' ? 'rgba(96, 165, 250, 0.08)' : 'rgba(38, 139, 210, 0.05)' }]} />
      <ExpoStatusBar style={themeType === 'DARK' ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={commonStyles.flex}>
        <View style={styles.header}>
          <CompactHeader
            surahs={surahs}
            selectedSurahId={selectedSurahId}
            isFetchingSurahs={isFetchingSurahs}
            onSurahChange={handleSurahChange}
            currentPageInput={currentPageInput}
            onCurrentPageChange={setCurrentPageInput}
            onCurrentPageSubmit={() => void handlePageInputSubmit()}
            canGoPreviousPage={computed.canGoPreviousPage}
            canGoNextPage={computed.canGoNextPage}
            onPreviousPress={() => goToAdjacentPage('previous')}
            onNextPress={() => goToAdjacentPage('next')}
            startVerseInput={startVerseInput}
            endVerseInput={endVerseInput}
            repeatCountInput={repeatCountInput}
            onStartVerseChange={setStartVerseInput}
            onEndVerseChange={setEndVerseInput}
            onRepeatCountChange={setRepeatCountInput}
            maxVerseInSurah={surahDetail?.verse_count}
            playbackStatus={player.playbackStatus}
            onStart={() => void handleStartPlayback()}
            onPause={() => void player.pausePlayback()}
            onResume={() => void player.resumePlayback()}
            onStop={() => void player.stopPlayback()}
            onSettingsPress={() => setIsSettingsOpen(true)}
            text={{
              startVerse: text.startVerse,
              endVerse: text.endVerse,
              repeat: text.repeat,
              start: text.start,
              page: text.page,
            }}
          />
        </View>

        {errorMessage ? <ErrorCard message={errorMessage} /> : null}

        {isFetchingInitial || !surahDetail ? (
          <View style={styles.loaderState}>
            <ActivityIndicator size="large" color={theme.colors.ACCENT_PRIMARY} />
          </View>
        ) : (
          <VerseList
            currentPage={currentPage}
            currentPageVerses={computed.currentPageVerses}
            currentVerse={currentVerse}
            quranFontFamily={selectedQuranFont.fontFamily}
            quranTextStyle={selectedQuranFont.verseTextStyle}
            swipeHintText={text.swipeHint}
            autoScrollEnabled={isAutoScrollEnabled}
            onVerseTap={(verse) => void handleVerseTap(verse)}
            onVerseLongPress={handleVerseLongPress}
            onVisibleVerseChange={setVisibleVerseLocation}
            panHandlers={pageSwipeResponder}
          />
        )}

        <SettingsSheet
          visible={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          language={language}
          onLanguageChange={setLanguage}
          selectedTranslationAuthorId={selectedTranslationAuthorId}
          translationOptionsForLanguage={translationOptionsForLanguage}
          onTranslationChange={handleTranslationChange}
          selectedReciterId={selectedReciterId}
          reciterOptions={RECITER_OPTIONS}
          onReciterChange={handleReciterChange}
          autoScrollEnabled={isAutoScrollEnabled}
          onAutoScrollChange={setIsAutoScrollEnabled}
          ayahTrackingEnabled={isAyahTrackingEnabled}
          ayahTrackingAvailable={ayahTrackingAvailable}
          onAyahTrackingChange={setIsAyahTrackingEnabled}
          onThemeChange={setThemeType}
          quranFontId={selectedQuranFontId}
          quranFontOptions={QURAN_FONT_OPTIONS}
          onQuranFontChange={setSelectedQuranFontId}
          playbackRate={player.playbackRate}
          onPlaybackRateChange={player.setPlaybackRate}
          quranFontPreview={QURAN_FONT_PREVIEW_TEXT}
          quranFontFamily={selectedQuranFont.fontFamily}
          quranFontPreviewStyle={selectedQuranFont.previewTextStyle}
          onAboutPress={() => {
            setIsSettingsOpen(false);
            setIsAboutOpen(true);
          }}
          onManageDownloadsPress={() => {
            setIsSettingsOpen(false);
            setIsDownloadManagerOpen(true);
          }}
          text={text}
        />

        <DownloadManagerSheet
          visible={isDownloadManagerOpen}
          onClose={() => setIsDownloadManagerOpen(false)}
          selectedReciterLabel={selectedReciter.label}
          cacheStats={cacheStats}
          isDownloadingAll={isDownloadingAll}
          downloadProgressLabel={downloadProgressLabel}
          onDownloadAll={() => void handleDownloadAll()}
          onClearDownloads={() => void handleClearDownloads()}
          text={text}
        />

        <AboutSheet
          visible={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
          appVersion={APP_VERSION}
          developerName={DEVELOPER_NAME}
          text={text}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}

function AppShell() {
  const settings = useAppSettings();

  return (
    <ThemeProvider themeType={settings.themeType} onThemeChange={settings.setThemeType}>
      <MainApp settings={settings} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 8,
  },
  loaderState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
  },
});
