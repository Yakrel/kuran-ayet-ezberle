import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SurahPicker } from './SurahPicker';
import { InlineRangeSelector } from './InlineRangeSelector';
import { PlaybackSpeedModal } from './PlaybackSpeedModal';
import { RangeInputModal } from './RangeInputModal';
import type { SurahSummary } from '../types/quran';
import { useTheme } from '../hooks/useTheme';
import { onlyDigits } from '../utils/parsers';
import { formatPlaybackRate } from '../utils/playbackRate';
import { UI_SIZES } from '../constants/spacing';
import { TOTAL_QURAN_PAGES } from '../constants/defaults';

type CompactHeaderProps = {
  // Surah & Page
  surahs: SurahSummary[];
  selectedSurahId: number | null;
  isFetchingSurahs: boolean;
  onSurahChange: (surahId: number | string) => void;
  currentPageInput: string;
  onCurrentPageChange: (value: string) => void;
  onCurrentPageSubmit: () => void;
  canGoPreviousPage: boolean;
  canGoNextPage: boolean;
  onPreviousPress: () => void;
  onNextPress: () => void;
  
  // Range & Repeat
  startVerseInput: string;
  endVerseInput: string;
  repeatCountInput: string;
  onStartVerseChange: (value: string) => void;
  onEndVerseChange: (value: string) => void;
  onRepeatCountChange: (value: string) => void;
  maxVerseInSurah?: number;
  pageEndVerseNumber?: number | null;
  
  playbackStatus: 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  
  // Settings
  onSettingsPress: () => void;
  
  // i18n
  text: {
    surah: string;
    searchSurah: string;
    noSurahResults: string;
    ayahUnit: string;
    startVerse: string;
    endVerse: string;
    firstVerse: string;
    repeat: string;
    start: string;
    pause: string;
    resume: string;
    stop: string;
    page: string;
    previousPage: string;
    nextPage: string;
    settings: string;
    playbackSpeed: string;
    invalidPlaybackSpeed: string;
    lastVerse: string;
    pageEndVerse: string;
    cancel: string;
    confirm: string;
    max: string;
    rangeInputError: string;
  };
};

export function CompactHeader({
  surahs,
  selectedSurahId,
  isFetchingSurahs,
  onSurahChange,
  currentPageInput,
  onCurrentPageChange,
  onCurrentPageSubmit,
  canGoPreviousPage,
  canGoNextPage,
  onPreviousPress,
  onNextPress,
  startVerseInput,
  endVerseInput,
  repeatCountInput,
  onStartVerseChange,
  onEndVerseChange,
  onRepeatCountChange,
  maxVerseInSurah,
  pageEndVerseNumber,
  playbackStatus,
  onStart,
  onPause,
  onResume,
  onStop,
  playbackRate,
  onPlaybackRateChange,
  onSettingsPress,
  text,
}: CompactHeaderProps) {
  const { theme, themeType } = useTheme();
  const [rangeModalType, setRangeModalType] = useState<'start' | 'end' | 'repeat' | 'speed' | null>(null);
  const normalizedCurrentPageInput = currentPageInput === '0' ? '1' : currentPageInput;

  const isPlaying = playbackStatus === 'playing';
  const isPaused = playbackStatus === 'paused';
  const isLoading = playbackStatus === 'loading';

  return (
    <View style={styles.container}>
      {/* Row 1: Surah + Page + Settings */}
      <View style={styles.row1}>
        <View style={[styles.surahPanel, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
          <SurahPicker
            surahs={surahs}
            selectedSurahId={selectedSurahId}
            isFetchingSurahs={isFetchingSurahs}
            onSurahChange={onSurahChange}
            text={{
              surah: text.surah,
              searchSurah: text.searchSurah,
              noSurahResults: text.noSurahResults,
              ayahUnit: text.ayahUnit,
            }}
          />
        </View>

        <View style={[styles.pagePanel, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
          <Pressable
            onPress={onPreviousPress}
            disabled={!canGoPreviousPage}
            accessibilityRole="button"
            accessibilityLabel={text.previousPage}
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY },
              !canGoPreviousPage && styles.navButtonDisabled,
            ]}
          >
            <Feather name="chevron-left" size={16} color={canGoPreviousPage ? theme.colors.TEXT_PRIMARY : theme.colors.TEXT_MUTED} />
          </Pressable>

          <View style={[styles.pageInputWrap, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}>
            <TextInput
              value={normalizedCurrentPageInput}
              onChangeText={(text) => onCurrentPageChange(onlyDigits(text))}
              onSubmitEditing={onCurrentPageSubmit}
              keyboardType="number-pad"
              style={[styles.pageInput, { color: theme.colors.TEXT_PRIMARY }]}
              selectTextOnFocus
            />
            <Text style={[styles.pageTotal, { color: theme.colors.TEXT_MUTED }]}>/{TOTAL_QURAN_PAGES}</Text>
          </View>

          <Pressable
            onPress={onNextPress}
            disabled={!canGoNextPage}
            accessibilityRole="button"
            accessibilityLabel={text.nextPage}
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY },
              !canGoNextPage && styles.navButtonDisabled,
            ]}
          >
            <Feather name="chevron-right" size={16} color={canGoNextPage ? theme.colors.TEXT_PRIMARY : theme.colors.TEXT_MUTED} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.settingsButton, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}
          onPress={onSettingsPress}
          accessibilityRole="button"
          accessibilityLabel={text.settings}
        >
          <Feather name="settings" size={18} color={theme.colors.TEXT_PRIMARY} />
        </Pressable>
      </View>

      {/* Row 2: Playback State + Range + Controls */}
      <View style={[styles.row2, { backgroundColor: themeType === 'DARK' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(42, 161, 152, 0.12)', borderColor: theme.colors.BORDER_PRIMARY }]}>
        <View style={styles.controlsSection}>
          <InlineRangeSelector
            startVerse={startVerseInput}
            endVerse={endVerseInput}
            playbackRateLabel={formatPlaybackRate(playbackRate)}
            repeatCount={repeatCountInput}
            onStartPress={() => setRangeModalType('start')}
            onEndPress={() => setRangeModalType('end')}
            onSpeedPress={() => setRangeModalType('speed')}
            onRepeatPress={() => setRangeModalType('repeat')}
            startLabel={text.startVerse}
            endLabel={text.endVerse}
            repeatLabel={text.repeat}
          />

          <View style={styles.actions}>
            {isLoading ? (
              <View style={[styles.actionButton, styles.actionButtonSmall, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}>
                <Feather name="loader" size={16} color={themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff'} />
              </View>
            ) : isPlaying ? (
              <>
                <Pressable
                  style={[styles.actionButton, styles.actionButtonSmall, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
                  onPress={onPause}
                  accessibilityRole="button"
                  accessibilityLabel={text.pause}
                >
                  <Feather name="pause" size={16} color={themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff'} />
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.actionButtonSmall, { backgroundColor: theme.colors.ERROR }]}
                  onPress={onStop}
                  accessibilityRole="button"
                  accessibilityLabel={text.stop}
                >
                  <Feather name="square" size={14} color="#fff" />
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
                onPress={isPaused ? onResume : onStart}
                accessibilityRole="button"
                accessibilityLabel={isPaused ? text.resume : text.start}
              >
                <Feather name="play" size={16} color={themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff'} />
                <Text style={[styles.actionButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>
                  {isPaused ? text.resume : text.start}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Range Input Modals */}
      <RangeInputModal
        visible={rangeModalType === 'start'}
        onClose={() => setRangeModalType(null)}
        title={text.startVerse}
        initialValue={startVerseInput}
        onSubmit={onStartVerseChange}
        minValue={1}
        minActionLabel={text.firstVerse}
        maxValue={maxVerseInSurah}
        maxLabel={text.max}
        cancelLabel={text.cancel}
        submitLabel={text.confirm}
        validationErrorLabel={text.rangeInputError}
        placeholder="1"
      />
      <RangeInputModal
        visible={rangeModalType === 'end'}
        onClose={() => setRangeModalType(null)}
        title={text.endVerse}
        initialValue={endVerseInput}
        onSubmit={onEndVerseChange}
        minValue={1}
        maxValue={maxVerseInSurah}
        maxActionLabel={text.lastVerse}
        quickActions={
          pageEndVerseNumber
            ? [{ label: text.pageEndVerse, value: String(pageEndVerseNumber), icon: 'corner-down-right' }]
            : []
        }
        maxLabel={text.max}
        cancelLabel={text.cancel}
        submitLabel={text.confirm}
        validationErrorLabel={text.rangeInputError}
        placeholder="1"
      />
      <RangeInputModal
        visible={rangeModalType === 'repeat'}
        onClose={() => setRangeModalType(null)}
        title={text.repeat}
        initialValue={repeatCountInput}
        onSubmit={onRepeatCountChange}
        minValue={1}
        quickActions={[
          { label: '5x', value: '5', icon: 'repeat' },
          { label: '10x', value: '10', icon: 'repeat' },
          { label: '20x', value: '20', icon: 'repeat' },
        ]}
        maxLabel={text.max}
        cancelLabel={text.cancel}
        submitLabel={text.confirm}
        validationErrorLabel={text.rangeInputError}
        placeholder="1"
      />
      <PlaybackSpeedModal
        visible={rangeModalType === 'speed'}
        onClose={() => setRangeModalType(null)}
        title={text.playbackSpeed}
        currentRate={playbackRate}
        onSubmit={onPlaybackRateChange}
        invalidText={text.invalidPlaybackSpeed}
        cancelLabel={text.cancel}
        submitLabel={text.confirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    height: UI_SIZES.HEADER_ROW_1_HEIGHT,
  },
  surahPanel: {
    flex: 1.8,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 2,
    overflow: 'hidden',
  },
  pagePanel: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 4,
    marginRight: 6,
    overflow: 'hidden',
  },
  pageInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 60,
  },
  pageInput: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
    minWidth: 26,
    flex: 1,
  },
  pageTotal: {
    fontSize: 9,
    fontWeight: '600',
  },
  navButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  settingsButton: {
    width: UI_SIZES.HEADER_ROW_1_HEIGHT,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row2: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    gap: 6,
    minHeight: UI_SIZES.HEADER_ROW_2_HEIGHT,
  },
  stateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'row',
    width: 86,
    gap: 6,
    justifyContent: 'flex-end',
  },
  actionButton: {
    height: 34,
    minWidth: 34,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 5,
  },
  actionButtonSmall: {
    width: 34,
    paddingHorizontal: 0,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
