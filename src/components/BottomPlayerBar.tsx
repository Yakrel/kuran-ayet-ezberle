import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

type BottomPlayerBarProps = {
  playbackState: 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';
  activeLocationText: string;
  currentVerseText?: string;
  progressLabel: string;
  progressPercent: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function BottomPlayerBar({
  playbackState,
  activeLocationText,
  currentVerseText,
  progressLabel,
  progressPercent,
  onStart,
  onPause,
  onResume,
  onStop,
}: BottomPlayerBarProps) {
  const { theme, themeType } = useTheme();
  const isPlaying = playbackState === 'playing';
  const isPaused = playbackState === 'paused';
  const isLoading = playbackState === 'loading';
  const stateLabel = isLoading ? 'Loading' : isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Ready';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeType === 'DARK' ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 252, 245, 0.96)',
          borderColor: theme.colors.BORDER_SECONDARY,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.locationText, { color: theme.colors.TEXT_TERTIARY }]} numberOfLines={1}>
              {activeLocationText}
            </Text>
            <View style={[styles.statePill, { backgroundColor: theme.colors.ACCENT_PRIMARY + '22', borderColor: theme.colors.ACCENT_PRIMARY + '55' }]}>
              <Text style={[styles.statePillText, { color: theme.colors.ACCENT_PRIMARY }]}>{stateLabel}</Text>
            </View>
          </View>
          <Text style={[styles.verseText, { color: theme.colors.ACCENT_PRIMARY }]} numberOfLines={1}>
            {currentVerseText ?? progressLabel}
          </Text>
          <Text style={[styles.progressLabel, { color: theme.colors.TEXT_MUTED }]} numberOfLines={1}>
            {progressLabel}
          </Text>
        </View>

        <View style={styles.controlsSection}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.ACCENT_PRIMARY} style={styles.loader} />
          ) : isPlaying ? (
            <View style={styles.controlRow}>
              <Pressable style={[styles.iconButton, { backgroundColor: theme.colors.ACCENT_PRIMARY }]} onPress={onPause}>
                <Feather name="pause" size={20} color={theme.colors.TEXT_PRIMARY} />
              </Pressable>
              <Pressable style={[styles.iconButton, { backgroundColor: theme.colors.ERROR }]} onPress={onStop}>
                <Feather name="square" size={18} color={theme.colors.TEXT_PRIMARY} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
              onPress={isPaused ? onResume : onStart}
            >
              <Feather name="play" size={22} color={theme.colors.TEXT_PRIMARY} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, progressPercent))}%`, backgroundColor: theme.colors.ACCENT_PRIMARY }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 68,
  },
  infoSection: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    flex: 1,
  },
  statePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statePillText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  verseText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  controlsSection: {
    marginLeft: 10,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    width: 40,
    height: 40,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
});
