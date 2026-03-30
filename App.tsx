import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { KeyboardAvoidingView, Modal, Platform, SafeAreaView, StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { Amiri_400Regular } from '@expo-google-fonts/amiri';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';

import { TopControlBar } from './src/components/TopControlBar';
import { SettingsPanel } from './src/components/SettingsPanel';
import { PlaybackControls } from './src/components/PlaybackControls';
import { StatusDisplay } from './src/components/StatusDisplay';
import { ErrorCard } from './src/components/ErrorCard';
import { VerseList } from './src/components/VerseList';
import { BottomPlayerBar } from './src/components/BottomPlayerBar';

import { useI18n } from './src/hooks/useI18n';
import { useAudioPlayer } from './src/hooks/useAudioPlayer';
import { useSurahs } from './src/hooks/useSurahs';
import { useSurahDetail } from './src/hooks/useSurahDetail';
import { usePageNavigation } from './src/hooks/usePageNavigation';
import { useSwipeGesture } from './src/hooks/useSwipeGesture';
import { useComputedState } from './src/hooks/useComputedState';
import { playbackReducer, initialPlaybackState } from './src/reducers/playbackReducer';
import { navigationReducer, initialNavigationState } from './src/reducers/navigationReducer';
import { parsePositiveInt, parseSurahId } from './src/utils/parsers';
import { buildVerseFileName } from './src/utils/formatters';
import { defaultTranslationAuthorByLanguage } from './src/utils/language';
import { TRANSLATION_OPTIONS } from './src/constants/authors';
import { APP_VERSION, DEFAULT_RANGE_SIZE, DEFAULT_REPEAT, DEVELOPER_NAME, TOTAL_QURAN_PAGES } from './src/constants/defaults';
import { QURAN_FONT_OPTIONS, QURAN_FONT_PREVIEW_TEXT, type QuranFontId } from './src/constants/quranFonts';
import { fetchPageVerses } from './src/services/quranService';
import type { Verse } from './src/types/quran';
import type { VerseLocation } from './src/reducers/types';
import { theme } from './src/styles/theme';
import { commonStyles } from './src/styles/common';

import { Storage } from './src/services/storage';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { clearAllDownloads, downloadAudioBundle, downloadSurahAudio, getAvailableSpaceMB, getCachedAudioFileNames, getCacheStats } from './src/services/audioCache';
import { SURAH_LIST } from './src/constants/surahList';
import { getTrackPlayerUnavailableReason } from './src/services/trackPlayer';

// Prevent splash screen from hiding until fonts are loaded
void SplashScreen.preventAutoHideAsync();

const TOTAL_AUDIO_FILES = SURAH_LIST.reduce((sum, surah) => sum + surah.verse_count, 0);

function MainApp() {
  const [fontsLoaded] = useFonts({
    Amiri_400Regular,
    NotoNaskhArabic_400Regular,
    ScheherazadeNew_400Regular,
  });

  const { language, setLanguage, text } = useI18n();
  
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [selectedTranslationAuthorId, setSelectedTranslationAuthorId] = useState<number>(() =>
    defaultTranslationAuthorByLanguage(language)
  );
  
  const [startVerseInput, setStartVerseInput] = useState('1');
  const [verseCountInput, setVerseCountInput] = useState(String(DEFAULT_RANGE_SIZE));
  const [repeatCountInput, setRepeatCountInput] = useState(String(DEFAULT_REPEAT));
  
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);
  const [isDownloadPromptOpen, setIsDownloadPromptOpen] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [selectedQuranFontId, setSelectedQuranFontId] = useState<QuranFontId>('scheherazade');

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: TOTAL_AUDIO_FILES, percent: 0 });
  const [cacheSize, setCacheSize] = useState(0);
  const [downloadedFileCount, setDownloadedFileCount] = useState(0);
  const [isFullDownloadComplete, setIsFullDownloadComplete] = useState(false);

  const refreshCacheState = useCallback(async () => {
    const stats = await getCacheStats();
    const completed = stats.files >= TOTAL_AUDIO_FILES;

    setCacheSize(stats.megabytes);
    setDownloadedFileCount(stats.files);
    setIsFullDownloadComplete(completed);
    await Storage.setDownloadComplete(completed);

    return stats;
  }, []);

  // LOAD SAVED SETTINGS ON STARTUP
  useEffect(() => {
    async function loadSettings() {
      try {
        const [savedFont, savedSurah, savedTranslation, savedAutoScroll, lastVerse, onboardingDone, downloadComplete, stats] = await Promise.all([
          Storage.getQuranFont(),
          Storage.getSelectedSurah(),
          Storage.getSelectedTranslation(),
          Storage.getAutoScroll(),
          Storage.getLastVerse(),
          Storage.getOnboardingDone(),
          Storage.getDownloadComplete(),
          getCacheStats(),
        ]);

        if (savedFont) setSelectedQuranFontId(savedFont as QuranFontId);
        if (savedTranslation) setSelectedTranslationAuthorId(savedTranslation);
        if (savedAutoScroll !== null) setIsAutoScrollEnabled(savedAutoScroll);
        const completed = stats.files >= TOTAL_AUDIO_FILES;
        setCacheSize(stats.megabytes);
        setDownloadedFileCount(stats.files);
        setIsFullDownloadComplete(completed);
        setDownloadProgress({
          current: Math.min(stats.files, TOTAL_AUDIO_FILES),
          total: TOTAL_AUDIO_FILES,
          percent: Math.round((Math.min(stats.files, TOTAL_AUDIO_FILES) / TOTAL_AUDIO_FILES) * 100),
        });
        if (downloadComplete !== completed) {
          void Storage.setDownloadComplete(completed);
        }
        
        // If we have a last verse, jump to it
        if (lastVerse) {
          setSelectedSurahId(lastVerse.surahId);
          setStartVerseInput(String(lastVerse.verseNumber));
        } else if (savedSurah) {
          setSelectedSurahId(savedSurah);
        }

        // Prompt for download if first time
        if (!onboardingDone && stats.files < TOTAL_AUDIO_FILES) {
          setIsDownloadPromptOpen(true);
        }
      } catch (e) {
        // Silent fail on load
      }
    }
    void loadSettings();
  }, []);

  useEffect(() => {
    const trackPlayerError = getTrackPlayerUnavailableReason();
    if (trackPlayerError) {
      setErrorMessage(`Ses oynatici yuklenemedi: ${trackPlayerError}`);
    }
  }, []);

  // SAVE SETTINGS WHEN THEY CHANGE
  useEffect(() => {
    if (selectedQuranFontId) void Storage.setQuranFont(selectedQuranFontId);
  }, [selectedQuranFontId]);

  useEffect(() => {
    if (selectedTranslationAuthorId) void Storage.setSelectedTranslation(selectedTranslationAuthorId);
  }, [selectedTranslationAuthorId]);

  useEffect(() => {
    void Storage.setAutoScroll(isAutoScrollEnabled);
  }, [isAutoScrollEnabled]);

  useEffect(() => {
    if (selectedSurahId !== null) void Storage.setSelectedSurah(selectedSurahId);
  }, [selectedSurahId]);

  const [playbackState, dispatchPlayback] = useReducer(playbackReducer, initialPlaybackState);
  const [navigationState, dispatchNavigation] = useReducer(navigationReducer, initialNavigationState);
  const pendingPageJumpRef = useRef<VerseLocation | null>(null);
  const queuedVersesRef = useRef<Verse[]>([]);

  // Track and save the last visible verse
  useEffect(() => {
    const loc = navigationState.visibleVerseLocation;
    if (loc && selectedSurahId !== null) {
      void Storage.setLastVerse(loc.surah_id, loc.verse_number);
    }
  }, [navigationState.visibleVerseLocation, selectedSurahId]);
  
  const { surahs, isFetchingSurahs, error: surahsError } = useSurahs(text.loadingSurahsError);
  const { surahDetail, isFetchingSurahDetail, error: surahDetailError } = useSurahDetail(
    selectedSurahId,
    selectedTranslationAuthorId,
    text.loadingSurahDetailError
  );
  
  const computed = useComputedState(
    surahDetail,
    navigationState.currentPage,
    surahs,
    selectedSurahId
  );
  
  const selectedSurah = useMemo(
    () => surahs.find((surah) => surah.id === selectedSurahId) ?? null,
    [surahs, selectedSurahId]
  );
  
  const translationOptionsForLanguage = useMemo(
    () => TRANSLATION_OPTIONS.filter((option) => option.language === language),
    [language]
  );

  const selectedQuranFont = useMemo(
    () => QURAN_FONT_OPTIONS.find((option) => option.id === selectedQuranFontId) ?? QURAN_FONT_OPTIONS[0],
    [selectedQuranFontId]
  );
  
  const selectedTranslationLabel =
    TRANSLATION_OPTIONS.find((option) => option.id === selectedTranslationAuthorId)?.label ??
    translationOptionsForLanguage[0]?.label ??
    '-';
  
  const currentVerse =
    playbackState.currentVerseIndex !== null && playbackState.currentVerseIndex >= 0
      ? playbackState.selectedVerses[playbackState.currentVerseIndex] ?? null
      : null;
  
  const playbackStateText = useMemo(() => {
    switch (playbackState.playbackState) {
      case 'playing':
        return text.playing;
      case 'stopped':
        return text.stopped;
      default:
        return text.ready;
    }
  }, [playbackState.playbackState, text]);
  
  const activeLocationVerse =
    currentVerse ?? navigationState.visibleVerseLocation ?? computed.firstVerseOnCurrentPage;
  
  const activeLocationText = selectedSurah
    ? activeLocationVerse
      ? `${selectedSurah.id}. ${selectedSurah.name} • ${activeLocationVerse.surah_id}:${activeLocationVerse.verse_number}`
      : `${selectedSurah.id}. ${selectedSurah.name}`
    : '-';
  
  const currentVerseText = currentVerse
    ? `${currentVerse.surah_id}:${currentVerse.verse_number} (${playbackState.currentRepeat}/${playbackState.configuredRepeatCount})`
    : undefined;
  const pageProgressText = surahDetail ? `${navigationState.currentPage + 1}/${TOTAL_QURAN_PAGES}` : '-';

  const syncToVerseLocation = useCallback((location: VerseLocation) => {
    setStartVerseInput(String(location.verse_number));
    dispatchNavigation({
      type: 'SET_PAGE_AND_VERSE',
      page: location.page,
      location,
    });
  }, []);

  const prepareNextRange = useCallback((completedVerses: Verse[]) => {
    dispatchPlayback({ type: 'RESET' });

    if (!surahDetail || completedVerses.length === 0) {
      return;
    }

    const lastCompletedVerse = completedVerses[completedVerses.length - 1];
    const nextVerse = surahDetail.verses.find(
      (verse) => verse.verse_number === lastCompletedVerse.verse_number + 1
    );

    if (!nextVerse) {
      return;
    }

    syncToVerseLocation({
      surah_id: nextVerse.surah_id,
      verse_number: nextVerse.verse_number,
      page: nextVerse.page,
    });
  }, [surahDetail, syncToVerseLocation]);

  const handleAudioTrackChange = useCallback((payload: { verseIndex: number; repeat: number }) => {
    dispatchPlayback({ type: 'SET_REPEAT', repeat: payload.repeat });
    dispatchPlayback({ type: 'SET_VERSE_INDEX', index: payload.verseIndex });
  }, []);

  const handleQueueEnded = useCallback(() => {
    const completedVerses = queuedVersesRef.current;
    if (completedVerses.length > 0) {
      prepareNextRange(completedVerses);
    }
  }, [prepareNextRange]);

  const audioPlayer = useAudioPlayer(
    setErrorMessage,
    setIsPreparingAudio,
    text.stoppingAudioError,
    text.playbackError,
    text.audioModeError,
    handleAudioTrackChange,
    handleQueueEnded
  );
  
  const resolveRange = useCallback((overrideStartVerse?: number) => {
    if (!surahDetail) {
      throw new Error(text.surahNotReady);
    }
    const startVerse = overrideStartVerse ?? parsePositiveInt(startVerseInput);
    const verseCount = parsePositiveInt(verseCountInput);
    const repeatCount = parsePositiveInt(repeatCountInput);
    if (startVerse === null || verseCount === null || repeatCount === null) {
      throw new Error(text.rangeInputError);
    }
    if (startVerse > surahDetail.verse_count) {
      throw new Error(text.verseOutOfRange(surahDetail.verse_count));
    }
    const endVerse = Math.min(surahDetail.verse_count, startVerse + verseCount - 1);
    const verses = surahDetail.verses.filter(
      (verse) => verse.verse_number >= startVerse && verse.verse_number <= endVerse
    );
    if (!verses.length) {
      throw new Error(text.noVerseInRange);
    }
    return { verses, repeatCount, startVerse, endVerse };
  }, [verseCountInput, repeatCountInput, startVerseInput, surahDetail, text]);

  const handleStartPlayback = useCallback(async (overrideStartVerse?: number) => {
    try {
      const { verses, repeatCount, startVerse, endVerse } = resolveRange(overrideStartVerse);
      await audioPlayer.stopPlayback();
      const nextSessionToken = audioPlayer.playbackTokenRef.current + 1;
      audioPlayer.playbackTokenRef.current = nextSessionToken;
      queuedVersesRef.current = verses;
      setErrorMessage(null);
      dispatchPlayback({
        type: 'START_PLAYBACK',
        verses,
        repeatCount,
        rangeText: `${startVerse}-${endVerse}`,
      });
      await audioPlayer.startPlaybackSession(verses, repeatCount, nextSessionToken);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.startingPlaybackError);
      await audioPlayer.stopPlayback();
      queuedVersesRef.current = [];
      dispatchPlayback({ type: 'STOP_PLAYBACK' });
    }
  }, [resolveRange, audioPlayer, text.startingPlaybackError]);
  
  const handleStopPlayback = useCallback(async () => {
    await audioPlayer.stopPlayback();
    queuedVersesRef.current = [];
    dispatchPlayback({ type: 'STOP_PLAYBACK' });
  }, [audioPlayer]);
  
  const handleSurahChange = useCallback(
    (nextSurahId: number | string) => {
      const normalizedSurahId = parseSurahId(nextSurahId);
      if (normalizedSurahId === null) {
        setErrorMessage(text.invalidSurahSelection);
        return;
      }
      if (normalizedSurahId === selectedSurahId) {
        return;
      }
      void handleStopPlayback();
      setSelectedSurahId(normalizedSurahId);
    },
    [selectedSurahId, handleStopPlayback, text.invalidSurahSelection]
  );
  
  const handleVerseTap = useCallback((verse: Verse) => {
    syncToVerseLocation({
      surah_id: verse.surah_id,
      verse_number: verse.verse_number,
      page: verse.page,
    });
    dispatchPlayback({ type: 'RESET' });
  }, [syncToVerseLocation]);
  
  const handleVisibleVerseChange = useCallback((location: VerseLocation) => {
    dispatchNavigation({
      type: 'SET_VISIBLE_VERSE',
      location,
    });
  }, []);
  
  const handlePageChange = useCallback(async (page: number) => {
    if (page < 0 || page >= TOTAL_QURAN_PAGES) {
      return;
    }

    const currentSurahVerse = surahDetail?.verses.find((verse) => verse.page === page);
    if (currentSurahVerse) {
      syncToVerseLocation({
        surah_id: currentSurahVerse.surah_id,
        verse_number: currentSurahVerse.verse_number,
        page: currentSurahVerse.page,
      });
      return;
    }

    try {
      setErrorMessage(null);
      const pageVerses = await fetchPageVerses(page, selectedTranslationAuthorId);
      const firstVerseOnPage = pageVerses[0];
      if (!firstVerseOnPage) {
        return;
      }

      const nextLocation = {
        surah_id: firstVerseOnPage.surah_id,
        verse_number: firstVerseOnPage.verse_number,
        page: firstVerseOnPage.page,
      };

      await handleStopPlayback();

      if (selectedSurahId === firstVerseOnPage.surah_id) {
        pendingPageJumpRef.current = nextLocation;
        if (surahDetail) {
          syncToVerseLocation(nextLocation);
          pendingPageJumpRef.current = null;
        }
        return;
      }

      pendingPageJumpRef.current = nextLocation;
      setSelectedSurahId(firstVerseOnPage.surah_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.loadingSurahDetailError);
    }
  }, [
    surahDetail,
    selectedSurahId,
    selectedTranslationAuthorId,
    handleStopPlayback,
    syncToVerseLocation,
    text.loadingSurahDetailError,
  ]);
  
  const pageNavigation = usePageNavigation(
    computed.allPages,
    computed.currentPageIndex,
    selectedSurahId,
    surahDetail,
    surahs,
    computed.surahIndex,
    navigationState.currentPage,
    (page) => dispatchNavigation({ type: 'SET_PAGE', page }),
    setStartVerseInput,
    (location) => dispatchNavigation({ type: 'SET_VISIBLE_VERSE', location }),
    setSelectedSurahId,
    handleStopPlayback
  );
  
  const pageSwipeResponder = useSwipeGesture(
    pageNavigation.goToNextPage,
    pageNavigation.goToPreviousPage
  );

  const handleDownloadAll = useCallback(async () => {
    if (isDownloading) {
      return;
    }

    // Check for enough disk space (roughly 1GB)
    const availableMB = await getAvailableSpaceMB();
    if (availableMB < 1024) {
      Alert.alert(text.downloadPromptTitle, text.lowStorageWarning);
      return;
    }

    setIsDownloadManagerOpen(true);
    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: 100, percent: 0 });

    try {
      await downloadAudioBundle((type, progress) => {
        const percent = Math.round(progress * 100);
        if (type === 'download') {
          setDownloadProgress({
            current: percent,
            total: 100,
            percent: percent,
          });
        } else {
          // Unzip phase - we can show it as 100% download or a special state
          setDownloadProgress({
            current: 100,
            total: 100,
            percent: 100,
          });
        }
      });

      await Storage.setDownloadComplete(true);
      await Storage.setOnboardingDone(true);
      await refreshCacheState();
      
      Alert.alert(text.downloadPromptTitle, text.downloadComplete);
    } catch (e) {
      console.error('Download error:', e);
      await refreshCacheState();
      Alert.alert(text.downloadPromptTitle, text.downloadError);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, refreshCacheState, text.downloadComplete, text.downloadError, text.downloadPromptTitle]);

  const handleClearDownloads = useCallback(() => {
    Alert.alert(
      text.clearDownloads,
      text.deleteDownloads,
      [
        { text: text.cancel, style: 'cancel' },
        { 
          text: text.clearDownloads, 
          style: 'destructive', 
          onPress: async () => {
            await clearAllDownloads();
            await Storage.setDownloadComplete(false);
            await refreshCacheState();
            setDownloadProgress({ current: 0, total: TOTAL_AUDIO_FILES, percent: 0 });
          } 
        }
      ]
    );
  }, [refreshCacheState, text.cancel, text.clearDownloads, text.deleteDownloads]);
  
  useEffect(() => {
    if (surahs.length > 0 && selectedSurahId === null) {
      setSelectedSurahId(surahs[0].id);
    }
  }, [surahs, selectedSurahId]);

  useEffect(() => {
    if (!isDownloadManagerOpen || isDownloading) {
      return;
    }

    void refreshCacheState().then((stats) => {
      const current = Math.min(stats.files, TOTAL_AUDIO_FILES);
      setDownloadProgress({
        current,
        total: TOTAL_AUDIO_FILES,
        percent: Math.round((current / TOTAL_AUDIO_FILES) * 100),
      });
    });
  }, [isDownloadManagerOpen, isDownloading, refreshCacheState]);
  
  useEffect(() => {
    if (!surahDetail) {
      return;
    }
    
    const boundaryPreference = pageNavigation.pendingPageBoundaryRef.current;
    const pendingPageJump = pendingPageJumpRef.current;
    const shouldUsePendingPageJump = pendingPageJump?.surah_id === surahDetail.id;

    pageNavigation.pendingPageBoundaryRef.current = null;
    if (shouldUsePendingPageJump) {
      pendingPageJumpRef.current = null;
    }
    
    const initialPage =
      shouldUsePendingPageJump
        ? pendingPageJump.page
        : boundaryPreference === 'last'
        ? surahDetail.verses[surahDetail.verses.length - 1]?.page ?? surahDetail.verses[0]?.page ?? 0
        : surahDetail.verses[0]?.page ?? 0;

    const initialVerse =
      shouldUsePendingPageJump
        ? surahDetail.verses.find(
            (verse) =>
              verse.page === pendingPageJump.page &&
              verse.verse_number === pendingPageJump.verse_number
          ) ?? surahDetail.verses.find((verse) => verse.page === initialPage) ?? surahDetail.verses[0]
        : surahDetail.verses.find((verse) => verse.page === initialPage) ?? surahDetail.verses[0];

    if (initialVerse) {
      syncToVerseLocation(
        shouldUsePendingPageJump
          ? pendingPageJump
          : {
              surah_id: initialVerse.surah_id,
              verse_number: initialVerse.verse_number,
              page: initialVerse.page,
            }
      );
      setVerseCountInput(String(Math.min(DEFAULT_RANGE_SIZE, surahDetail.verse_count)));
    } else {
      setStartVerseInput('1');
      dispatchNavigation({ type: 'SET_VISIBLE_VERSE', location: null });
    }
    
    dispatchPlayback({ type: 'RESET' });
  }, [surahDetail, syncToVerseLocation]); // pageNavigation removed - stops infinite loop
  
  useEffect(() => {
    setSelectedTranslationAuthorId(defaultTranslationAuthorByLanguage(language));
  }, [language]);
  
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

  if (!fontsLoaded) {
    return null;
  }
  
  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ExpoStatusBar style="light" />
      <View style={commonStyles.statusTopSpacer} />
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={commonStyles.flex}>
        {/* Minimal Top Header */}
        <View style={styles.header}>
          <TopControlBar
            surahs={surahs}
            selectedSurahId={selectedSurahId}
            isFetchingSurahs={isFetchingSurahs}
            onSurahChange={handleSurahChange}
            settingsText={text.settings}
            onSettingsPress={() => setIsSettingsOpen(true)}
            canGoPreviousPage={computed.canGoPreviousPage}
            canGoNextPage={computed.canGoNextPage}
            onPreviousPress={pageNavigation.goToPreviousPage}
            onNextPress={pageNavigation.goToNextPage}
            onPageChange={(page) => void handlePageChange(page)}
            pageText={text.page}
            currentPage={navigationState.currentPage}
            pageProgressText={pageProgressText}
            minPage={0}
            maxPage={TOTAL_QURAN_PAGES - 1}
          />
        </View>

        {errorMessage ? <ErrorCard message={errorMessage} /> : null}

        {/* Content - Verse List */}
        <VerseList
          currentPageVerses={computed.currentPageVerses}
          currentVerse={currentVerse}
          quranFontFamily={selectedQuranFont.fontFamily}
          currentPage={navigationState.currentPage}
          pageText={text.page}
          pageProgressText={pageProgressText}
          swipeHintText={text.swipeHint}
          autoScrollEnabled={isAutoScrollEnabled}
          onVerseTap={handleVerseTap}
          onVerseLongPress={(verse) => void handleStartPlayback(verse.verse_number)}
          onVisibleVerseChange={handleVisibleVerseChange}
          panHandlers={pageSwipeResponder}
        />

        {/* Floating Player Bar */}
        <BottomPlayerBar
          playbackState={playbackState.playbackState}
          currentVerseText={currentVerseText}
          activeLocationText={activeLocationText}
          onStart={() => void handleStartPlayback()}
          onStop={() => void handleStopPlayback()}
          isPreparingAudio={isPreparingAudio}
          progressText={playbackState.activeRangeText}
          readyToStartText={text.readyToStart}
        />

        {/* Settings & Configuration Modal */}
        <Modal
          visible={isSettingsOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSettingsOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{text.settings}</Text>
                <Pressable onPress={() => setIsSettingsOpen(false)} style={styles.closeButton}>
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
                  autoScrollEnabled={isAutoScrollEnabled}
                  onAutoScrollChange={setIsAutoScrollEnabled}
                  quranFontId={selectedQuranFontId}
                  quranFontOptions={QURAN_FONT_OPTIONS}
                  onQuranFontChange={setSelectedQuranFontId}
                  quranFontText={text.quranFont}
                  fontPreviewText={text.fontPreview}
                  quranFontPreview={QURAN_FONT_PREVIEW_TEXT}
                  quranFontFamily={selectedQuranFont.fontFamily}
                  languageText={text.language}
                  translationText={text.translation}
                  autoScrollText={text.autoScroll}
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

                <View style={styles.modalSection}>
                  <PlaybackControls
                    startVerseInput={startVerseInput}
                    verseCountInput={verseCountInput}
                    repeatCountInput={repeatCountInput}
                    onStartVerseChange={setStartVerseInput}
                    onVerseCountChange={setVerseCountInput}
                    onRepeatCountChange={setRepeatCountInput}
                    onStart={() => {
                      setIsSettingsOpen(false);
                      void handleStartPlayback();
                    }}
                    onStop={() => {
                      setIsSettingsOpen(false);
                      void handleStopPlayback();
                    }}
                    startText={text.start}
                    stopText={text.stop}
                    startVerseText={text.startVerse}
                    verseCountText={text.verseCount}
                    repeatText={text.repeat}
                  />
                </View>

                <View style={styles.modalSection}>
                  <StatusDisplay
                    statusText={text.status}
                    playbackStateText={playbackStateText}
                    locationText={text.location}
                    activeLocationText={activeLocationText}
                    pageText={text.page}
                    currentPage={navigationState.currentPage}
                    pageProgressText={pageProgressText}
                    translationText={text.translation}
                    selectedTranslationLabel={selectedTranslationLabel}
                    rangeText={text.range}
                    activeRangeText={playbackState.activeRangeText}
                    activeText={text.active}
                    currentVerseText={currentVerseText}
                    isPreparingAudio={isPreparingAudio}
                    isFetchingSurahDetail={isFetchingSurahDetail}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* About Modal */}
        <Modal
          visible={isAboutOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsAboutOpen(false)}
        >
          <View style={styles.aboutOverlay}>
            <View style={styles.aboutContent}>
              <View style={styles.aboutHeader}>
                <View style={styles.logoContainer}>
                  <View style={styles.crescentIcon}>
                    <Feather name="moon" size={32} color={theme.colors.ACCENT_PRIMARY} />
                  </View>
                  <View style={styles.bookIcon}>
                    <Feather name="book-open" size={24} color={theme.colors.TEXT_PRIMARY} />
                  </View>
                </View>
                <Text style={styles.aboutTitle}>{text.appName}</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v{APP_VERSION}</Text>
                </View>
              </View>

              <ScrollView style={styles.aboutScroll} showsVerticalScrollIndicator={true}>
                <View style={styles.aboutSection}>
                  <Text style={styles.aboutSectionTitle}>{text.developedBy}</Text>
                  <Text style={styles.aboutSectionValue}>{DEVELOPER_NAME}</Text>
                </View>

                <View style={styles.aboutSection}>
                  <Text style={styles.aboutSectionTitle}>{text.changelog}</Text>
                  <View style={styles.changelogItem}>
                    <View style={styles.changelogDot} />
                    <View>
                      <Text style={styles.changelogVersion}>v{APP_VERSION} ({text.initialRelease})</Text>
                      <Text style={styles.changelogDesc}>• {text.changelogPlaybackLoop}</Text>
                      <Text style={styles.changelogDesc}>• {text.changelogAudioTracking}</Text>
                      <Text style={styles.changelogDesc}>• {text.changelogFonts}</Text>
                      <Text style={styles.changelogDesc}>• {text.changelogLanguages}</Text>
                      <Text style={styles.changelogDesc}>• {text.changelogOfflineListening}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <Pressable style={styles.aboutCloseButton} onPress={() => setIsAboutOpen(false)}>
                <Text style={styles.aboutCloseButtonText}>{text.close}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Download Manager Modal */}
        <Modal
          visible={isDownloadManagerOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setIsDownloadManagerOpen(false);
          }}
        >
          <View style={styles.aboutOverlay}>
            <View style={styles.aboutContent}>
              <View style={styles.aboutHeader}>
                <Feather name="download-cloud" size={48} color={theme.colors.ACCENT_PRIMARY} />
                <Text style={styles.aboutTitle}>{text.manageDownloads}</Text>
              </View>

              <View style={styles.downloadStats}>
                <Text style={styles.statsLabel}>{text.storageUsed}</Text>
                <Text style={styles.statsValue}>{cacheSize.toFixed(1)} MB</Text>
              </View>

              <View style={styles.downloadStats}>
                <Text style={styles.statsLabel}>{text.readyVerses}</Text>
                <Text style={styles.statsValue}>
                  {downloadedFileCount} / {TOTAL_AUDIO_FILES}
                </Text>
              </View>

              {isDownloading ? (
                <View style={styles.downloadingSection}>
                  <ActivityIndicator size="small" color={theme.colors.ACCENT_PRIMARY} style={styles.downloadSpinner} />
                  <Text style={styles.downloadingText}>{text.downloadingAll}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${downloadProgress.percent}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {downloadProgress.current} / {downloadProgress.total} ({downloadProgress.percent}%)
                  </Text>
                </View>
              ) : (
                <View style={styles.downloadActions}>
                  <Pressable
                    style={[styles.downloadButton, isFullDownloadComplete && styles.downloadButtonDisabled]}
                    onPress={handleDownloadAll}
                    disabled={isFullDownloadComplete}
                  >
                    <Feather name="download" size={20} color={theme.colors.TEXT_PRIMARY} />
                    <Text style={styles.downloadButtonText}>
                      {isFullDownloadComplete ? text.downloadReady : text.downloadAll}
                    </Text>
                  </Pressable>

                  <Pressable style={[styles.downloadButton, styles.clearButton]} onPress={handleClearDownloads}>
                    <Feather name="trash-2" size={20} color={theme.colors.TEXT_PRIMARY} />
                    <Text style={styles.downloadButtonText}>{text.clearDownloads}</Text>
                  </Pressable>
                </View>
              )}

              <Pressable 
                style={[styles.aboutCloseButton, { marginTop: 20 }]} 
                onPress={() => setIsDownloadManagerOpen(false)}
              >
                <Text style={styles.aboutCloseButtonText}>{text.close}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* First-time Onboarding Prompt */}
        <Modal
          visible={isDownloadPromptOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setIsDownloadPromptOpen(false);
            void Storage.setOnboardingDone(true);
          }}
        >
          <View style={styles.aboutOverlay}>
            <View style={styles.promptContent}>
              <Feather name="info" size={48} color={theme.colors.ACCENT_PRIMARY} style={{ marginBottom: 16 }} />
              <Text style={styles.promptTitle}>{text.downloadPromptTitle}</Text>
              <Text style={styles.promptDesc}>{text.downloadPromptDesc}</Text>
              
              <View style={styles.promptActions}>
                <Pressable 
                  style={styles.promptButtonLater} 
                  onPress={() => {
                    setIsDownloadPromptOpen(false);
                    void Storage.setOnboardingDone(true);
                  }}
                >
                  <Text style={styles.promptButtonTextLater}>{text.downloadLater}</Text>
                </Pressable>
                <Pressable 
                  style={styles.promptButtonNow} 
                  onPress={() => {
                    setIsDownloadPromptOpen(false);
                    void Storage.setOnboardingDone(true);
                    void handleDownloadAll();
                  }}
                >
                  <Text style={styles.promptButtonTextNow}>{text.downloadNow}</Text>
                </Pressable>
              </View>
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
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: theme.spacing.XL,
    marginTop: theme.spacing.SM,
    paddingHorizontal: theme.spacing.MD,
    paddingVertical: theme.spacing.SM,
    backgroundColor: theme.colors.SECONDARY_BG,
    borderRadius: theme.borderRadius.LARGE,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_PRIMARY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.SECONDARY_BG,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.BORDER_PRIMARY,
  },
  modalTitle: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
    gap: 20,
  },
  modalSection: {
    gap: 12,
  },
  aboutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  aboutContent: {
    width: '100%',
    backgroundColor: theme.colors.SECONDARY_BG,
    borderRadius: 30,
    padding: 24,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: theme.colors.BORDER_PRIMARY,
  },
  aboutHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.TERTIARY_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.ACCENT_PRIMARY,
  },
  crescentIcon: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  bookIcon: {
    marginTop: 8,
  },
  aboutTitle: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionBadge: {
    backgroundColor: theme.colors.TERTIARY_BG,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.ACCENT_PRIMARY,
  },
  versionText: {
    color: theme.colors.ACCENT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },
  aboutScroll: {
    marginBottom: 24,
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutSectionTitle: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  aboutSectionValue: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
  },
  changelogItem: {
    flexDirection: 'row',
    gap: 12,
  },
  changelogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.ACCENT_PRIMARY,
    marginTop: 6,
  },
  changelogVersion: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  changelogDesc: {
    color: theme.colors.TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
  },
  aboutCloseButton: {
    backgroundColor: theme.colors.ACCENT_PRIMARY,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  aboutCloseButtonText: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  downloadStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.TERTIARY_BG,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statsLabel: {
    color: theme.colors.TEXT_TERTIARY,
    fontWeight: '600',
  },
  statsValue: {
    color: theme.colors.ACCENT_PRIMARY,
    fontWeight: '800',
  },
  downloadActions: {
    gap: 12,
  },
  downloadButton: {
    backgroundColor: theme.colors.TERTIARY_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
  },
  downloadButtonDisabled: {
    opacity: 0.45,
  },
  clearButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  downloadButtonText: {
    color: theme.colors.TEXT_PRIMARY,
    fontWeight: '700',
  },
  downloadingSection: {
    alignItems: 'center',
    padding: 20,
  },
  downloadSpinner: {
    marginBottom: 12,
  },
  downloadingText: {
    color: theme.colors.TEXT_PRIMARY,
    marginBottom: 16,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.TERTIARY_BG,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.ACCENT_PRIMARY,
  },
  progressText: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: 12,
  },
  promptContent: {
    width: '85%',
    backgroundColor: theme.colors.SECONDARY_BG,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.BORDER_PRIMARY,
  },
  promptTitle: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  promptDesc: {
    color: theme.colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  promptButtonLater: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    alignItems: 'center',
  },
  promptButtonNow: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.ACCENT_PRIMARY,
    alignItems: 'center',
  },
  promptButtonTextLater: {
    color: theme.colors.TEXT_SECONDARY,
    fontWeight: '600',
  },
  promptButtonTextNow: {
    color: theme.colors.TEXT_PRIMARY,
    fontWeight: '700',
  },
});
