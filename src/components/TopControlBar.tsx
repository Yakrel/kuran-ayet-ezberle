import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SurahSummary } from '../types/quran';
import { SurahPicker } from './SurahPicker';
import { theme } from '../styles/theme';

type TopControlBarProps = {
  surahs: SurahSummary[];
  selectedSurahId: number | null;
  isFetchingSurahs: boolean;
  onSurahChange: (surahId: number | string) => void;
  surahText: string;
  settingsText: string;
  onSettingsPress: () => void;
  canGoPreviousPage: boolean;
  canGoNextPage: boolean;
  onPreviousPress: () => void;
  onNextPress: () => void;
  pageText: string;
  pageProgressText: string;
};

export function TopControlBar({
  surahs,
  selectedSurahId,
  isFetchingSurahs,
  onSurahChange,
  surahText,
  settingsText,
  onSettingsPress,
  canGoPreviousPage,
  canGoNextPage,
  onPreviousPress,
  onNextPress,
  pageText,
  pageProgressText,
}: TopControlBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.surahSection}>
        <SurahPicker
          surahs={surahs}
          selectedSurahId={selectedSurahId}
          isFetchingSurahs={isFetchingSurahs}
          onSurahChange={onSurahChange}
          label={surahText}
        />
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.pageCard}>
          <Text style={styles.sectionLabel}>{pageText}</Text>
          <View style={styles.pageNavSection}>
            <Pressable
              onPress={onPreviousPress}
              disabled={!canGoPreviousPage}
              style={[styles.navButton, !canGoPreviousPage && styles.navButtonDisabled]}
            >
              <Feather
                name="chevron-left"
                size={18}
                color={!canGoPreviousPage ? theme.colors.TEXT_MUTED : theme.colors.TEXT_PRIMARY}
              />
            </Pressable>

            <View style={styles.pageInfo}>
              <Text style={styles.pageValue}>{pageProgressText}</Text>
            </View>

            <Pressable
              onPress={onNextPress}
              disabled={!canGoNextPage}
              style={[styles.navButton, !canGoNextPage && styles.navButtonDisabled]}
            >
              <Feather
                name="chevron-right"
                size={18}
                color={!canGoNextPage ? theme.colors.TEXT_MUTED : theme.colors.TEXT_PRIMARY}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.settingsButton}
          onPress={onSettingsPress}
          accessibilityRole="button"
          accessibilityLabel={settingsText}
        >
          <Feather name="settings" size={20} color={theme.colors.TEXT_PRIMARY} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.SM,
  },
  surahSection: {
    minWidth: 0,
    borderRadius: theme.borderRadius.LARGE,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.SM,
  },
  pageCard: {
    flex: 1,
    gap: 6,
    borderRadius: theme.borderRadius.LARGE,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionLabel: {
    color: theme.colors.TEXT_MUTED,
    fontSize: theme.fontSize.XS,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  pageNavSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.SMALL,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  pageInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  pageValue: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: theme.fontSize.MD,
    fontWeight: '700',
  },
  settingsButton: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.LARGE,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
});
