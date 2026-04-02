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
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';

import { CompactHeader } from './src/components/CompactHeader';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ErrorCard } from './src/components/ErrorCard';
import { SettingsPanel } from './src/components/SettingsPanel';
import { VerseList } from './src/components/VerseList';
import { TRANSLATION_OPTIONS } from './src/constants/authors';
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
  clearAllSurahAudio,
  downloadAllSurahAudio,
  getSurahAudioCacheStats,
} from './src/services/surahAudioCache';
import { fetchPageVerses, fetchSurahDetail } from './src/services/quranService';
import { commonStyles } from './src/styles/common';
import { theme as staticTheme } from './src/styles/theme';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import type { Verse } from './src/types/quran';
import { defaultTranslationAuthorByLanguage } from './src/utils/language';
import { parsePositiveInt, parseSurahId } from './src/utils/parsers';

void SplashScreen.preventAutoHideAsync();

function formatDurationLabel(currentMs: number, durationMs: number) {
  const toClock = (value: number) => {
    const totalSeconds = Math.max(0, Math.floor(value / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return `${toClock(currentMs)} / ${toClock(durationMs)}`;
}

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
  const [selectedQuranFontId, setSelectedQuranFontId] = useState<QuranFontId>('scheherazade');
  const [startVerseInput, setStartVerseInput] = useState('1');
  const [endVerseInput, setEndVerseInput] = useState(String(DEFAULT_RANGE_SIZE));
  const [repeatCountInput, setRepeatCountInput] = useState(String(DEFAULT_REPEAT));
  const [currentPageInput, setCurrentPageInput] = useState('1');
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleVerseLocation, setVisibleVerseLocation] = useState<{
    surah_id: number;
    verse_number: number;
    page: number;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState({ files: 0, megabytes: 0 });
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgressLabel, setDownloadProgressLabel] = useState('');

  const pendingPageJumpRef = useRef<{ surahId: number; page: number; verseNumber: number } | null>(null);

  const { surahs, isFetchingSurahs, error: surahsError } = useSurahs(text.loadingSurahsError);
  const { surahDetail, error: surahDetailError } = useSurahDetail(
    selectedSurahId,
    selectedTranslationAuthorId,
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

  const selectedSurah = useMemo(
    () => surahs.find((surah) => surah.id === selectedSurahId) ?? null,
    [selectedSurahId, surahs]
  );

  const player = useSegmentedPlayer({
    onError: setErrorMessage,
    onActiveVerseChange: (verse) => {
      if (!verse) {
        return;
      }

      setVisibleVerseLocation({
        surah_id: verse.surah_id,
        verse_number: verse.verse_number,
        page: verse.page,
      });
      if (verse.surah_id === selectedSurahId) {
        setCurrentPage(verse.page);
      }
      void Storage.setLastVerse(verse.surah_id, verse.verse_number);
    },
  });

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
      const [savedFont, savedSurah, savedTranslation, savedAutoScroll, lastVerse, stats] = await Promise.all([
        Storage.getQuranFont(),
        Storage.getSelectedSurah(),
        Storage.getSelectedTranslation(),
        Storage.getAutoScroll(),
        Storage.getLastVerse(),
        getSurahAudioCacheStats(),
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
      if (savedAutoScroll !== null) {
        setIsAutoScrollEnabled(savedAutoScroll);
      }
      if (lastVerse) {
        pendingPageJumpRef.current = {
          surahId: lastVerse.surahId,
          page: 0,
          verseNumber: lastVerse.verseNumber,
        };
      }
      setCacheStats(stats);
    }

    void loadPersistedState();
  }, []);

  useEffect(() => {
    setCurrentPageInput(String(currentPage + 1));
  }, [currentPage]);

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
    if (page < 0 || page >= TOTAL_QURAN_PAGES) {
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

    const pageVerses = await fetchPageVerses(page, selectedTranslationAuthorId);
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
      setCurrentPageInput(String(currentPage + 1));
      return;
    }

    const nextPage = parsedPage - 1;
    if (nextPage < 0 || nextPage >= TOTAL_QURAN_PAGES) {
      setCurrentPageInput(String(currentPage + 1));
      return;
    }

    await handlePageChange(nextPage);
  };

  const handleVerseTap = async (verse: Verse) => {
    setCurrentPage(verse.page);
    setStartVerseInput(String(verse.verse_number));
    setEndVerseInput(String(verse.verse_number));
    setVisibleVerseLocation({
      surah_id: verse.surah_id,
      verse_number: verse.verse_number,
      page: verse.page,
    });
    await handleStartPlayback(verse.verse_number);
  };

  const handleDownloadAll = async () => {
    try {
      setIsDownloadingAll(true);
      setDownloadProgressLabel('0%');

      const details = await Promise.all(
        surahs.map((surah) => fetchSurahDetail(surah.id, selectedTranslationAuthorId))
      );
      const audios = details
        .filter((detail) => Boolean(detail.audio))
        .map((detail) => ({
          surahId: detail.id,
          remoteUrl: detail.audio!.url,
        }));

      await downloadAllSurahAudio(audios, (progress) => {
        setDownloadProgressLabel(`${progress.current}/${progress.total} • ${progress.percent}%`);
      });

      setCacheStats(await getSurahAudioCacheStats());
      setDownloadProgressLabel(text.downloadComplete);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.downloadError);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleClearDownloads = async () => {
    Alert.alert(text.clearDownloads, text.deleteDownloads, [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.clearDownloads,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearAllSurahAudio();
            setCacheStats(await getSurahAudioCacheStats());
            setDownloadProgressLabel('');
          })();
        },
      },
    ]);
  };

  const currentVerse = player.activeVerse;
  const currentVerseText = currentVerse
    ? `${currentVerse.surah_id}:${currentVerse.verse_number} • ${player.currentRepeat}/${parsePositiveInt(repeatCountInput) ?? 1}`
    : undefined;
  const activeLocationVerse = currentVerse ?? visibleVerseLocation ?? computed.firstVerseOnCurrentPage;
  const activeLocationText = selectedSurah
    ? activeLocationVerse
      ? `${selectedSurah.id}. ${selectedSurah.name} • ${activeLocationVerse.surah_id}:${activeLocationVerse.verse_number}`
      : `${selectedSurah.id}. ${selectedSurah.name}`
    : '-';
  const resolvedRepeatCount = parsePositiveInt(repeatCountInput) ?? 1;
  const resolvedRangeEnd = Math.min(
    Number(endVerseInput || startVerseInput || '1'),
    surahDetail?.verse_count ?? 1
  );
  const progressLabel = `${formatDurationLabel(player.currentTimeMs, player.durationMs)} • ${startVerseInput}-${resolvedRangeEnd}`;
  const progressPercent = player.durationMs > 0 ? Math.round((player.currentTimeMs / player.durationMs) * 100) : 0;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={[commonStyles.safeArea, { backgroundColor: theme.colors.PRIMARY_BG }]}>
      <View style={[styles.backgroundGlowTop, { backgroundColor: themeType === 'DARK' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(42, 161, 152, 0.08)' }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: themeType === 'DARK' ? 'rgba(96, 165, 250, 0.08)' : 'rgba(38, 139, 210, 0.05)' }]} />
      <ExpoStatusBar style={themeType === 'DARK' ? 'light' : 'dark'} />
      <View style={commonStyles.statusTopSpacer} />
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
            currentVerse={currentVerse ?? undefined}
            currentRepeat={player.currentRepeat}
            totalRepeats={parsePositiveInt(repeatCountInput) ?? 1}
            progressPercent={progressPercent}
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
            currentPageVerses={computed.currentPageVerses}
            currentVerse={currentVerse}
            activeWordLocation={player.activeWordLocation}
            quranFontFamily={selectedQuranFont.fontFamily}
            sectionTitle=""
            pageProgressText={`${text.page} ${currentPage + 1}/${TOTAL_QURAN_PAGES}`}
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
                  autoScrollEnabled={isAutoScrollEnabled}
                  onAutoScrollChange={setIsAutoScrollEnabled}
                  quranFontId={selectedQuranFontId}
                  quranFontOptions={QURAN_FONT_OPTIONS}
                  onQuranFontChange={setSelectedQuranFontId}
                  playbackRate={player.playbackRate}
                  onPlaybackRateChange={player.setPlaybackRate}
                  quranFontText={text.quranFont}
                  fontPreviewText={text.fontPreview}
                  quranFontPreview={QURAN_FONT_PREVIEW_TEXT}
                  quranFontFamily={selectedQuranFont.fontFamily}
                  languageText={text.language}
                  translationText={text.translation}
                  autoScrollText={text.autoScroll}
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
                <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.storageUsed}: ${cacheStats.megabytes} MB`}</Text>
                <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.cachedFiles}: ${cacheStats.files} MP3`}</Text>
                {downloadProgressLabel ? <Text style={[styles.downloadHint, { color: theme.colors.TEXT_MUTED }]}>{downloadProgressLabel}</Text> : null}

                <Pressable
                  style={[styles.downloadButton, isDownloadingAll && styles.downloadButtonDisabled, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
                  disabled={isDownloadingAll}
                  onPress={() => void handleDownloadAll()}
                >
                  <Text style={[styles.downloadButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>
                    {isDownloadingAll ? text.downloadingAll : text.downloadAll}
                  </Text>
                </Pressable>

                <Pressable style={[styles.clearButton, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]} onPress={() => void handleClearDownloads()}>
                  <Text style={[styles.clearButtonText, { color: theme.colors.TEXT_SECONDARY }]}>{text.clearDownloads}</Text>
                </Pressable>
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
