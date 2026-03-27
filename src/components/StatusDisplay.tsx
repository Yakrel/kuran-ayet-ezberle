import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../styles/theme';

type StatusDisplayProps = {
  statusText: string;
  playbackStateText: string;
  locationText: string;
  activeLocationText: string;
  pageText: string;
  currentPage: number;
  pageProgressText: string;
  translationText: string;
  selectedTranslationLabel: string;
  rangeText?: string;
  activeRangeText?: string;
  activeText?: string;
  currentVerseText?: string;
  isPreparingAudio: boolean;
  isFetchingSurahDetail: boolean;
};

export function StatusDisplay({
  statusText,
  playbackStateText,
  locationText,
  activeLocationText,
  pageText,
  currentPage,
  pageProgressText,
  translationText,
  selectedTranslationLabel,
  rangeText,
  activeRangeText,
  activeText,
  currentVerseText,
  isPreparingAudio,
  isFetchingSurahDetail,
}: StatusDisplayProps) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLine}>
        <Text style={styles.statusLabel}>{statusText}:</Text>
        <Text style={styles.statusValue}>{playbackStateText}</Text>
        {isPreparingAudio ? <ActivityIndicator size="small" color={theme.colors.WARNING} /> : null}
        {isFetchingSurahDetail ? <ActivityIndicator size="small" color={theme.colors.INFO} /> : null}
      </View>
      
      <View style={styles.statusLine}>
        <Text style={styles.statusLabel}>{locationText}:</Text>
        <Text style={styles.statusValue}>{activeLocationText}</Text>
      </View>
      
      <View style={styles.statusLine}>
        <Text style={styles.statusLabel}>{translationText}:</Text>
        <Text style={styles.statusValue} numberOfLines={1}>{selectedTranslationLabel}</Text>
      </View>
      
      {activeRangeText && rangeText ? (
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{rangeText}:</Text>
          <Text style={styles.statusValue}>{activeRangeText}</Text>
        </View>
      ) : null}
      
      {currentVerseText && activeText ? (
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{activeText}:</Text>
          <Text style={styles.statusValue}>{currentVerseText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.BORDER_SECONDARY,
    paddingTop: theme.spacing.MD,
    minHeight: 110, // Maintain a stable minimum height for the status area
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.SM,
    height: 20, // Give each line a fixed height to prevent vertical jitter
  },
  statusLabel: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: theme.fontSize.XS,
    fontWeight: '600',
    minWidth: 80, // Ensure labels have a consistent width
  },
  statusValue: {
    color: theme.colors.TEXT_SECONDARY,
    fontSize: theme.fontSize.XS,
    flex: 1,
  },
});
