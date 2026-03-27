import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SurahSummary } from '../types/quran';
import { SurahPicker } from './SurahPicker';
import { theme } from '../styles/theme';
import { onlyDigits } from '../utils/parsers';

type TopControlBarProps = {
  surahs: SurahSummary[];
  selectedSurahId: number | null;
  isFetchingSurahs: boolean;
  onSurahChange: (surahId: number | string) => void;
  settingsText: string;
  onSettingsPress: () => void;
  canGoPreviousPage: boolean;
  canGoNextPage: boolean;
  onPreviousPress: () => void;
  onNextPress: () => void;
  onPageChange: (page: number) => void;
  pageText: string;
  currentPage: number;
  pageProgressText: string;
  minPage: number;
  maxPage: number;
};

export function TopControlBar({
  surahs,
  selectedSurahId,
  isFetchingSurahs,
  onSurahChange,
  settingsText,
  onSettingsPress,
  canGoPreviousPage,
  canGoNextPage,
  onPreviousPress,
  onNextPress,
  onPageChange,
  pageText,
  currentPage,
  pageProgressText,
  minPage,
  maxPage,
}: TopControlBarProps) {
  const [pageInput, setPageInput] = useState(String(currentPage + 1));
  const totalPageLabel = pageProgressText.includes('/') ? pageProgressText.split('/')[1] : String(maxPage + 1);
  
  const handlePageInputChange = (text: string) => {
    const cleaned = onlyDigits(text);
    setPageInput(cleaned);
  };
  
  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= minPage + 1 && pageNum <= maxPage + 1) {
      onPageChange(pageNum - 1);
    } else {
      setPageInput(String(currentPage + 1));
    }
  };
  
  useEffect(() => {
    setPageInput(String(currentPage + 1));
  }, [currentPage]);
  
  return (
    <View style={styles.container}>
      {/* Surah Picker - Takes most space */}
      <View style={styles.surahSection}>
        <SurahPicker
          surahs={surahs}
          selectedSurahId={selectedSurahId}
          isFetchingSurahs={isFetchingSurahs}
          onSurahChange={onSurahChange}
        />
      </View>

      {/* Page Navigation - Compact center section */}
      <View style={styles.pageNavSection}>
        <Pressable
          onPress={onPreviousPress}
          disabled={!canGoPreviousPage}
          style={[styles.navButton, !canGoPreviousPage && styles.navButtonDisabled]}
        >
          <Feather
            name="chevron-left"
            size={20}
            color={!canGoPreviousPage ? theme.colors.TEXT_MUTED : theme.colors.TEXT_PRIMARY}
          />
        </Pressable>

        <View style={styles.pageInputWrapper}>
          <TextInput
            value={pageInput}
            onChangeText={handlePageInputChange}
            onSubmitEditing={handlePageInputSubmit}
            onBlur={handlePageInputSubmit}
            keyboardType="number-pad"
            style={styles.pageInput}
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />
          <Text style={styles.pageProgress}>/{totalPageLabel}</Text>
        </View>

        <Pressable
          onPress={onNextPress}
          disabled={!canGoNextPage}
          style={[styles.navButton, !canGoNextPage && styles.navButtonDisabled]}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={!canGoNextPage ? theme.colors.TEXT_MUTED : theme.colors.TEXT_PRIMARY}
          />
        </Pressable>
      </View>

      {/* Settings Button - Icon only */}
      <Pressable style={styles.settingsButton} onPress={onSettingsPress}>
        <Feather name="settings" size={22} color={theme.colors.TEXT_PRIMARY} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.MD,
  },
  surahSection: {
    flex: 1,
  },
  pageNavSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.SM,
    backgroundColor: theme.colors.TERTIARY_BG,
    borderRadius: theme.borderRadius.MEDIUM,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    paddingHorizontal: theme.spacing.SM,
    paddingVertical: theme.spacing.XS,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.SMALL,
    backgroundColor: theme.colors.CARD_BG,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  pageInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: theme.spacing.XS,
  },
  pageInput: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: theme.fontSize.LG,
    fontWeight: '700',
    minWidth: 32,
    maxWidth: 50,
    textAlign: 'center',
    padding: 4,
    borderRadius: theme.borderRadius.SMALL,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_ACCENT,
    backgroundColor: theme.colors.CARD_BG,
  },
  pageProgress: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: theme.fontSize.MD,
    fontWeight: '600',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.MEDIUM,
    backgroundColor: theme.colors.CARD_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
