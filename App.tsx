import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { Amiri_400Regular } from '@expo-google-fonts/amiri';
import { Lateef_400Regular } from '@expo-google-fonts/lateef';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';

import { CompactHeader } from './src/components/CompactHeader';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ErrorCard } from './src/components/ErrorCard';
import { SettingsPanel } from './src/components/SettingsPanel';
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
import {
  QURAN_FONT_OPTIONS,
  QURAN_FONT_PREVIEW_TEXT,
  type QuranFontId,
} from './src/constants/quranFonts';
import { useComputedState } from './src/hooks/useComputedState';
import { useI18n } from './src/hooks/useI18n';
import { usePageNavigation } from './src/hooks/usePageNavigation';
import { useSegmentedPlayer } from './src/hooks/useSegmentedPlayer';
import { useSurahDetail } from './src/hooks/useSurahDetail';
import { useSurahs } from './src/hooks/useSurahs';
import { useSwipeGesture } from './src/hooks/useSwipeGesture';
import { Storage } from './src/services/storage';
import {
  clearAllDownloads,
  downloadAudioBundle,
  getAvailableSpaceMB,
  getCacheStats,
  initializeAudioCache,
} from './src/services/audioCache';
import { clearAudioDiagnosticLog, getAudioDiagnosticLog } from './src/services/audioDiagnostics';
import { clearAllSurahAudio } from './src/services/surahAudioCache';
import { fetchPageVerses } from './src/services/quranService';
import { commonStyles } from './src/styles/common';
import { theme as staticTheme } from './src/styles/theme';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import type { Verse } from './src/types/quran';
import { defaultTranslationAuthorByLanguage } from './src/utils/language';
import { parsePositiveInt, parseSurahId } from './src/utils/parsers';

void SplashScreen.preventAutoHideAsync();

function MainApp() {
  const [fontsLoaded] = useFonts({
    Amiri_400Regular,
    Lateef_400Regular,
    NotoNaskhArabic_400Regular,
    ScheherazadeNew_400Regular,
  });

  const { language, setLanguage, text } = useI18n();
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [selectedTranslationAuthorId, setSelectedTranslationAuthorId] = useState<number>(() =>
    defaultTranslationAuthorByLanguage(language)
  );
  const [selectedReciterId, setSelectedReciterId] = useState<ReciterId>(DEFAULT_RECITER_ID);
  const [selectedQuranFontId, setSelectedQuranFontId] = useState<QuranFontId>('scheherazade');
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
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isAyahTrackingEnabled, setIsAyahTrackingEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState({ files: 0, megabytes: 0, readyVerses: 0, totalVerses: 0, offlineReady: false });
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgressLabel, setDownloadProgressLabel] = useState('');
  const [audioDiagnosticLog, setAudioDiagnosticLog] = useState('');

  const pendingPageJumpRef = useRef<{ surahId: number; page: number; verseNumber: number } | null>(null);

  const { surahs, isFetchingSurahs, error: surahsError } = useSurahs(text.loadingSurahsError);
  const { surahDetail, error: surahDetailError } = useSurahDetail(
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

  const player = useSegmentedPlayer({
    reciterId: selectedReciterId,
    onError: setErrorMessage,
    onActiveVerseChange: (verse) => {
      if (!isAyahTrackingEnabled || !verse) {
        return;
      }

      setVisibleVerseLocation({
        surah_id: verse.surah_id,
        verse_number: verse.verse_number,
        page: verse.page,
      });
      if (verse.surah_id === selectedSurahId && verse.page !== currentPage) {
        setCurrentPage(verse.page);
      }
      void Storage.setLastVerse(verse.surah_id, verse.verse_number);
    },
  });
  const currentPlayingVerse = player.activeVerse;
  const selectedReciter = useMemo(() => getReciterOption(selectedReciterId), [selectedReciterId]);
  const ayahTrackingAvailable = useMemo(() => hasEmbeddedTracking(selectedReciterId), [selectedReciterId]);

  const pageNavigation = usePageNavigation(
    computed.allPages,
    computed.currentPageIndex,
    selectedSurahId,
    surahDetail,
    surahs,
    computed.surahIndex,
    currentPage,
    setCurrentPage,
    () => undefined,
    setVisibleVerseLocation,
    setSelectedSurahId,
    player.stopPlayback
  );

  const pageSwipeResponder = useSwipeGesture(
    pageNavigation.goToNextPage,
    pageNavigation.goToPreviousPage
  );

  useEffect(() => {
    async function loadPersistedState() {
      await initializeAudioCache(DEFAULT_RECITER_ID);
      const [savedFont, savedSurah, savedTranslation, savedReciter, savedAutoScroll, savedAyahTracking, lastVerse] = await Promise.all([
        Storage.getQuranFont(),
        Storage.getSelectedSurah(),
        Storage.getSelectedTranslation(),
        Storage.getSelectedReciter(),
        Storage.getAutoScroll(),
        Storage.getAyahTracking(),
        Storage.getLastVerse(),
      ]);

      if (savedFont) {
        setSelectedQuranFontId(savedFont as QuranFontId);
      }
      if (savedSurah) {
        setSelectedSurahId(savedSurah);
      }
      if (savedTranslation) {
        setSelectedTranslationAuthorId(savedTranslation);
      }
      if (savedReciter) {
        setSelectedReciterId(savedReciter);
      }
      if (savedAutoScroll !== null) {
        setIsAutoScrollEnabled(savedAutoScroll);
      }
      if (savedAyahTracking !== null) {
        setIsAyahTrackingEnabled(savedAyahTracking);
      }
      if (savedAyahTracking && lastVerse) {
        pendingPageJumpRef.current = {
          surahId: lastVerse.surahId,
          page: 1,
          verseNumber: lastVerse.verseNumber,
        };
      }
    }

    void loadPersistedState();
  }, []);

  useEffect(() => {
    void (async () => {
      await initializeAudioCache(selectedReciterId);
      setCacheStats(await getCacheStats(selectedReciterId));
      setAudioDiagnosticLog(await getAudioDiagnosticLog());
    })();
  }, [selectedReciterId]);

  useEffect(() => {
    const normalizedCurrentPage = Math.max(1, currentPage);
    if (normalizedCurrentPage !== currentPage) {
      setCurrentPage(normalizedCurrentPage);
      return;
    }

    setCurrentPageInput(String(normalizedCurrentPage));
  }, [currentPage]);

  useEffect(() => {
    void Storage.setAyahTracking(isAyahTrackingEnabled);
  }, [isAyahTrackingEnabled]);

  useEffect(() => {
    if (!ayahTrackingAvailable && isAyahTrackingEnabled) {
      setIsAyahTrackingEnabled(false);
    }
  }, [ayahTrackingAvailable, isAyahTrackingEnabled]);

  const { theme, themeType } = useTheme();

  useEffect(() => {
    if (surahs.length > 0 && selectedSurahId === null) {
      setSelectedSurahId(surahs[0].id);
    }
  }, [selectedSurahId, surahs]);

  useEffect(() => {
    if (surahsError) {
      setErrorMessage(surahsError);
    }
  }, [surahsError]);

  useEffect(() => {
    if (surahDetailError) {
      setErrorMessage(surahDetailError);
    }
  }, [surahDetailError]);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (selectedSurahId !== null) {
      void Storage.setSelectedSurah(selectedSurahId);
    }
  }, [selectedSurahId]);

  useEffect(() => {
    void Storage.setQuranFont(selectedQuranFontId);
  }, [selectedQuranFontId]);

  useEffect(() => {
    void Storage.setSelectedTranslation(selectedTranslationAuthorId);
  }, [selectedTranslationAuthorId]);

  useEffect(() => {
    void Storage.setAutoScroll(isAutoScrollEnabled);
  }, [isAutoScrollEnabled]);

  useEffect(() => {
    void Storage.setSelectedReciter(selectedReciterId);
  }, [selectedReciterId]);

  useEffect(() => {
    if (!isDownloadManagerOpen) {
      return;
    }

    void (async () => {
      setCacheStats(await getCacheStats(selectedReciterId));
      setAudioDiagnosticLog(await getAudioDiagnosticLog());
    })();
  }, [isDownloadManagerOpen, selectedReciterId]);

  useEffect(() => {
    setSelectedTranslationAuthorId(defaultTranslationAuthorByLanguage(language));
  }, [language]);

  useEffect(() => {
    if (!surahDetail) {
      return;
    }

    const pending = pendingPageJumpRef.current;
    const targetVerse = pending?.surahId === surahDetail.id
      ? surahDetail.verses.find((verse) => verse.verse_number === pending.verseNumber)
      : null;
    const initialVerse = targetVerse ?? surahDetail.verses[0] ?? null;

    if (!initialVerse) {
      return;
    }

    pendingPageJumpRef.current = null;
    setCurrentPage(targetVerse?.page ?? initialVerse.page);
    setVisibleVerseLocation({
      surah_id: initialVerse.surah_id,
      verse_number: initialVerse.verse_number,
      page: targetVerse?.page ?? initialVerse.page,
    });
    setStartVerseInput(String(targetVerse?.verse_number ?? initialVerse.verse_number));
    setEndVerseInput(String(Math.min(surahDetail.verse_count, (targetVerse?.verse_number ?? initialVerse.verse_number) + DEFAULT_RANGE_SIZE - 1)));
  }, [surahDetail]);

  const resolveRange = useMemo(() => {
    return (overrideStartVerse?: number) => {
      if (!surahDetail) {
        throw new Error(text.surahNotReady);
      }

      const startVerse = overrideStartVerse ?? parsePositiveInt(startVerseInput);
      const requestedEndVerse = parsePositiveInt(endVerseInput);
      const repeatCount = parsePositiveInt(repeatCountInput);

      if (startVerse === null || requestedEndVerse === null || repeatCount === null) {
        throw new Error(text.rangeInputError);
      }
      if (startVerse > surahDetail.verse_count) {
        throw new Error(text.verseOutOfRange(surahDetail.verse_count));
      }
      if (requestedEndVerse < startVerse) {
        throw new Error(text.rangeInputError);
      }

      const endVerse = Math.min(surahDetail.verse_count, requestedEndVerse);
      return { startVerse, endVerse, repeatCount };
    };
  }, [endVerseInput, repeatCountInput, startVerseInput, surahDetail, text]);

  const handleStartPlayback = async (overrideStartVerse?: number) => {
    try {
      if (!surahDetail) {
        throw new Error(text.surahNotReady);
      }

      const { startVerse, endVerse, repeatCount } = resolveRange(overrideStartVerse);
      setErrorMessage(null);
      setStartVerseInput(String(startVerse));
      setEndVerseInput(String(endVerse));
      await player.startPlayback({
        reciterId: selectedReciterId,
        surahDetail,
        startVerseNumber: startVerse,
        endVerseNumber: endVerse,
        repeatCount,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.startingPlaybackError);
    }
  };

  const handleSurahChange = async (nextSurahId: number | string) => {
    const normalizedSurahId = parseSurahId(nextSurahId);
    if (normalizedSurahId === null) {
      setErrorMessage(text.invalidSurahSelection);
      return;
    }

    await player.stopPlayback();
    setSelectedSurahId(normalizedSurahId);
  };

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > TOTAL_QURAN_PAGES) {
      return;
    }

    const currentSurahVerse = surahDetail?.verses.find((verse) => verse.page === page);
    if (currentSurahVerse) {
      setCurrentPage(page);
      setVisibleVerseLocation({
        surah_id: currentSurahVerse.surah_id,
        verse_number: currentSurahVerse.verse_number,
        page: currentSurahVerse.page,
      });
      return;
    }

    const pageVerses = await fetchPageVerses(page, selectedTranslationAuthorId, selectedReciterId);
    const firstVerse = pageVerses[0];
    if (!firstVerse) {
      return;
    }

    await player.stopPlayback();
    pendingPageJumpRef.current = {
      surahId: firstVerse.surah_id,
      page: firstVerse.page,
      verseNumber: firstVerse.verse_number,
    };
    setSelectedSurahId(firstVerse.surah_id);
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

  const handleVerseTap = async (verse: Verse) => {
    setCurrentPage(verse.page);
    
    const currentStartVerse = parsePositiveInt(startVerseInput) ?? 1;
    const currentEndVerse = parsePositiveInt(endVerseInput) ?? 1;
    const rangeSize = Math.abs(currentEndVerse - currentStartVerse);
    
    const newStart = verse.verse_number;
    const newEnd = Math.min(newStart + rangeSize, surahDetail?.verse_count ?? newStart);
    
    setStartVerseInput(String(newStart));
    setEndVerseInput(String(newEnd));
    setVisibleVerseLocation({
      surah_id: verse.surah_id,
      verse_number: verse.verse_number,
      page: verse.page,
    });
    
    // Direct playback with explicit values, bypassing validation
    try {
      if (!surahDetail) {
        throw new Error(text.surahNotReady);
      }
      
      const repeatCount = parsePositiveInt(repeatCountInput) ?? 1;
      setErrorMessage(null);
      
      await player.startPlayback({
        reciterId: selectedReciterId,
        surahDetail,
        startVerseNumber: newStart,
        endVerseNumber: newEnd,
        repeatCount,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.startingPlaybackError);
    }
  };

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
      setAudioDiagnosticLog(await getAudioDiagnosticLog());
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
            setAudioDiagnosticLog(await getAudioDiagnosticLog());
            setDownloadProgressLabel('');
          })();
        },
      },
    ]);
  };

  const currentVerse = currentPlayingVerse;

  if (!fontsLoaded) {
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
            onPreviousPress={pageNavigation.goToPreviousPage}
            onNextPress={pageNavigation.goToNextPage}
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

        {!surahDetail ? (
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
            sectionTitle=""
            pageProgressText=""
            swipeHintText={text.swipeHint}
            autoScrollEnabled={isAutoScrollEnabled}
            onVerseTap={(verse) => void handleVerseTap(verse)}
            onVerseLongPress={(verse) => void handleVerseTap(verse)}
            onVisibleVerseChange={setVisibleVerseLocation}
            panHandlers={pageSwipeResponder}
          />
        )}

        <Modal visible={isSettingsOpen} animationType="slide" transparent onRequestClose={() => setIsSettingsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.settings}</Text>
                <Pressable onPress={() => setIsSettingsOpen(false)} style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]}>
                  <Feather name="x" size={24} color={theme.colors.TEXT_PRIMARY} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <SettingsPanel
                  language={language}
                  onLanguageChange={setLanguage}
                  selectedTranslationAuthorId={selectedTranslationAuthorId}
                  translationOptionsForLanguage={translationOptionsForLanguage}
                  onTranslationChange={setSelectedTranslationAuthorId}
                  selectedReciterId={selectedReciterId}
                  reciterOptions={RECITER_OPTIONS}
                  onReciterChange={setSelectedReciterId}
                  autoScrollEnabled={isAutoScrollEnabled}
                  onAutoScrollChange={setIsAutoScrollEnabled}
                  ayahTrackingEnabled={isAyahTrackingEnabled}
                  ayahTrackingAvailable={ayahTrackingAvailable}
                  onAyahTrackingChange={setIsAyahTrackingEnabled}
                  quranFontId={selectedQuranFontId}
                  quranFontOptions={QURAN_FONT_OPTIONS}
                  onQuranFontChange={setSelectedQuranFontId}
                  playbackRate={player.playbackRate}
                  onPlaybackRateChange={player.setPlaybackRate}
                  quranFontText={text.quranFont}
                  fontPreviewText={text.fontPreview}
                  quranFontPreview={QURAN_FONT_PREVIEW_TEXT}
                  quranFontFamily={selectedQuranFont.fontFamily}
                  quranFontPreviewStyle={selectedQuranFont.previewTextStyle}
                  languageText={text.language}
                  translationText={text.translation}
                  reciterText={text.reciter}
                  trackedReciterText={text.trackedReciter}
                  autoScrollText={text.autoScroll}
                  ayahTrackingText={text.ayahTracking}
                  themeText={text.theme}
                  playbackSpeedText={text.playbackSpeed}
                  aboutText={text.about}
                  manageDownloadsText={text.manageDownloads}
                  onText={text.on}
                  offText={text.off}
                  onAboutPress={() => {
                    setIsSettingsOpen(false);
                    setIsAboutOpen(true);
                  }}
                  onManageDownloadsPress={() => {
                    setIsSettingsOpen(false);
                    setIsDownloadManagerOpen(true);
                  }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={isDownloadManagerOpen} animationType="slide" transparent onRequestClose={() => setIsDownloadManagerOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.manageDownloads}</Text>
                <Pressable onPress={() => setIsDownloadManagerOpen(false)} style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]}>
                  <Feather name="x" size={24} color={theme.colors.TEXT_PRIMARY} />
                </Pressable>
              </View>

              <View style={styles.downloadCard}>
                <Text style={[styles.downloadSubtitle, { color: theme.colors.TEXT_SECONDARY }]}>
                  {text.selectedReciterDownloads(selectedReciter.label)}
                </Text>
                <Text style={[styles.downloadHint, { color: theme.colors.TEXT_MUTED }]}>
                  {text.selectedReciterOnlyHint(selectedReciter.label)}
                </Text>
                <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.storageUsed}: ${cacheStats.megabytes} MB`}</Text>
                <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.readyVerses}: ${cacheStats.readyVerses}/${cacheStats.totalVerses}`}</Text>
                <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.cachedFiles}: ${cacheStats.files} MP3`}</Text>
                {downloadProgressLabel ? <Text style={[styles.downloadHint, { color: theme.colors.TEXT_MUTED }]}>{downloadProgressLabel}</Text> : null}

                <Pressable
                  style={[styles.downloadButton, isDownloadingAll && styles.downloadButtonDisabled, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
                  disabled={isDownloadingAll}
                  onPress={() => void handleDownloadAll()}
                >
                  <Text style={[styles.downloadButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>
                    {isDownloadingAll
                      ? text.downloadingSelectedReciter(selectedReciter.label)
                      : cacheStats.offlineReady
                      ? text.downloadReadyForReciter(selectedReciter.label)
                      : text.downloadSelectedReciter(selectedReciter.label)}
                  </Text>
                </Pressable>

                <Pressable style={[styles.clearButton, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]} onPress={() => void handleClearDownloads()}>
                  <Text style={[styles.clearButtonText, { color: theme.colors.TEXT_SECONDARY }]}>{text.clearReciterDownloads(selectedReciter.label)}</Text>
                </Pressable>

                <View style={[styles.diagnosticsCard, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}>
                  <View style={styles.diagnosticsHeader}>
                    <Text style={[styles.diagnosticsTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.audioDiagnostics}</Text>
                    <Pressable onPress={() => void (async () => {
                      await clearAudioDiagnosticLog();
                      setAudioDiagnosticLog(await getAudioDiagnosticLog());
                    })()}>
                      <Text style={[styles.clearLogsText, { color: theme.colors.ACCENT_PRIMARY }]}>{text.clearAudioLogs}</Text>
                    </Pressable>
                  </View>
                  <ScrollView style={styles.diagnosticsScroll}>
                    <Text style={[styles.diagnosticsLog, { color: theme.colors.TEXT_MUTED }]}>
                      {audioDiagnosticLog || text.noAudioLogs}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={isAboutOpen} animationType="fade" transparent onRequestClose={() => setIsAboutOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.aboutContent, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.about}</Text>
              <Text style={[styles.aboutText, { color: theme.colors.TEXT_SECONDARY }]}>{`${text.appName}\n${text.version}: ${APP_VERSION}\n${text.developedBy}: ${DEVELOPER_NAME}`}</Text>
              <Text style={[styles.aboutText, { color: theme.colors.TEXT_SECONDARY }]}>{text.aboutDescription}</Text>
              <Pressable style={[styles.downloadButton, { backgroundColor: theme.colors.ACCENT_PRIMARY }]} onPress={() => setIsAboutOpen(false)}>
                <Text style={[styles.downloadButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>{text.close}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </ErrorBoundary>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    padding: staticTheme.spacing.XL,
  },
  modalContent: {
    maxHeight: '88%',
    borderRadius: staticTheme.borderRadius.XXLARGE,
    backgroundColor: staticTheme.colors.SECONDARY_BG,
    borderWidth: 1,
    borderColor: staticTheme.colors.BORDER_PRIMARY,
    padding: staticTheme.spacing.LG,
    gap: staticTheme.spacing.MD,
  },
  aboutContent: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: staticTheme.colors.TEXT_PRIMARY,
    fontSize: staticTheme.fontSize.XL,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: staticTheme.colors.CARD_BG,
  },
  modalScroll: {
    gap: staticTheme.spacing.LG,
  },
  downloadCard: {
    gap: staticTheme.spacing.MD,
  },
  downloadStat: {
    color: staticTheme.colors.TEXT_PRIMARY,
    fontSize: staticTheme.fontSize.MD,
  },
  downloadHint: {
    color: staticTheme.colors.TEXT_MUTED,
    fontSize: staticTheme.fontSize.SM,
  },
  downloadSubtitle: {
    fontSize: staticTheme.fontSize.MD,
    fontWeight: '700',
  },
  downloadButton: {
    borderRadius: staticTheme.borderRadius.MEDIUM,
    backgroundColor: staticTheme.colors.ACCENT_PRIMARY,
    paddingVertical: staticTheme.spacing.MD,
    alignItems: 'center',
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: staticTheme.colors.TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: staticTheme.fontSize.MD,
  },
  clearButton: {
    borderRadius: staticTheme.borderRadius.MEDIUM,
    backgroundColor: staticTheme.colors.CARD_BG,
    paddingVertical: staticTheme.spacing.MD,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticTheme.colors.BORDER_SECONDARY,
  },
  clearButtonText: {
    color: staticTheme.colors.TEXT_SECONDARY,
    fontWeight: '700',
    fontSize: staticTheme.fontSize.MD,
  },
  diagnosticsCard: {
    borderWidth: 1,
    borderRadius: staticTheme.borderRadius.MEDIUM,
    padding: staticTheme.spacing.MD,
    gap: staticTheme.spacing.SM,
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: staticTheme.spacing.MD,
  },
  diagnosticsTitle: {
    fontSize: staticTheme.fontSize.MD,
    fontWeight: '700',
  },
  clearLogsText: {
    fontSize: staticTheme.fontSize.SM,
    fontWeight: '700',
  },
  diagnosticsScroll: {
    maxHeight: 180,
  },
  diagnosticsLog: {
    fontSize: staticTheme.fontSize.SM,
    lineHeight: 18,
  },
  aboutText: {
    color: staticTheme.colors.TEXT_SECONDARY,
    lineHeight: 22,
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
