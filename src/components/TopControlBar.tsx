import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SurahPicker } from './SurahPicker';
import type { SurahSummary } from '../types/quran';
import { useTheme } from '../hooks/useTheme';
import { onlyDigits } from '../utils/parsers';

type TopControlBarProps = {
  surahs: SurahSummary[];
  selectedSurahId: number | null;
  isFetchingSurahs: boolean;
  onSurahChange: (surahId: number | string) => void;
  surahText: string;
  canGoPreviousPage: boolean;
  canGoNextPage: boolean;
  onPreviousPress: () => void;
  onNextPress: () => void;
  pageText: string;
  currentPageInput: string;
  onCurrentPageChange: (value: string) => void;
  onCurrentPageSubmit: () => void;
};

export function TopControlBar({
  surahs,
  selectedSurahId,
  isFetchingSurahs,
  onSurahChange,
  surahText,
  canGoPreviousPage,
  canGoNextPage,
  onPreviousPress,
  onNextPress,
  pageText,
  currentPageInput,
  onCurrentPageChange,
  onCurrentPageSubmit,
}: TopControlBarProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.topBar}>
      <View
        style={[
          styles.surahPanel,
          { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY },
        ]}
      >
        <View style={styles.surahPickerWrap}>
          <SurahPicker
            surahs={surahs}
            selectedSurahId={selectedSurahId}
            isFetchingSurahs={isFetchingSurahs}
            onSurahChange={onSurahChange}
          />
        </View>
      </View>

      <View
        style={[
          styles.pageControls,
          {
            backgroundColor: theme.colors.SECONDARY_BG,
            borderColor: theme.colors.BORDER_PRIMARY,
          },
        ]}
      >
        <View style={styles.pageInputRow}>
          <Pressable
            onPress={onPreviousPress}
            disabled={!canGoPreviousPage}
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY },
              !canGoPreviousPage && styles.navButtonDisabled
            ]}
          >
            <Feather name="chevron-left" size={18} color={canGoPreviousPage ? theme.colors.TEXT_PRIMARY : theme.colors.TEXT_MUTED} />
          </Pressable>

          <View style={[styles.pageInputWrap, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}>
            <TextInput
              value={currentPageInput}
              onChangeText={(text) => onCurrentPageChange(onlyDigits(text))}
              onSubmitEditing={onCurrentPageSubmit}
              keyboardType="number-pad"
              style={[styles.pageInput, { color: theme.colors.TEXT_PRIMARY }]}
              selectTextOnFocus
            />
            <Text style={[styles.pageTotal, { color: theme.colors.TEXT_MUTED }]}>/ 604</Text>
          </View>

          <Pressable
            onPress={onNextPress}
            disabled={!canGoNextPage}
            style={[
              styles.navButton,
              { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY },
              !canGoNextPage && styles.navButtonDisabled
            ]}
          >
            <Feather name="chevron-right" size={18} color={canGoNextPage ? theme.colors.TEXT_PRIMARY : theme.colors.TEXT_MUTED} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  surahPanel: {
    flex: 1.7,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
  },
  surahPickerWrap: {
    flex: 1,
  },
  pageControls: {
    flex: 0.8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
    justifyContent: 'center',
  },
  pageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  pageInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 74,
    flex: 1,
  },
  pageInput: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
    minWidth: 30,
  },
  pageTotal: {
    fontSize: 10,
    fontWeight: '600',
  },
});
