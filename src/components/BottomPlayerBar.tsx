import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';

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
  const isPlaying = playbackState === 'playing';
  const isPaused = playbackState === 'paused';
  const isLoading = playbackState === 'loading';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.locationText} numberOfLines={1}>
            {activeLocationText}
          </Text>
          <Text style={styles.verseText} numberOfLines={1}>
            {currentVerseText ?? progressLabel}
          </Text>
          <Text style={styles.progressLabel} numberOfLines={1}>
            {progressLabel}
          </Text>
        </View>

        <View style={styles.controlsSection}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.ACCENT_PRIMARY} style={styles.loader} />
          ) : isPlaying ? (
            <View style={styles.controlRow}>
              <Pressable style={[styles.iconButton, styles.pauseButton]} onPress={onPause}>
                <Feather name="pause" size={20} color={theme.colors.TEXT_PRIMARY} />
              </Pressable>
              <Pressable style={[styles.iconButton, styles.stopButton]} onPress={onStop}>
                <Feather name="square" size={18} color={theme.colors.TEXT_PRIMARY} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.iconButton, styles.startButton]}
              onPress={isPaused ? onResume : onStart}
            >
              <Feather name="play" size={22} color={theme.colors.TEXT_PRIMARY} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, progressPercent))}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    ...theme.shadow.large,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    minHeight: 78,
  },
  infoSection: {
    flex: 1,
    gap: 2,
  },
  locationText: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  verseText: {
    color: theme.colors.ACCENT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  progressLabel: {
    color: theme.colors.TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  controlsSection: {
    marginLeft: 12,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: theme.colors.ACCENT_PRIMARY,
  },
  pauseButton: {
    backgroundColor: theme.colors.ACCENT_PRIMARY,
  },
  stopButton: {
    backgroundColor: theme.colors.ERROR,
  },
  loader: {
    width: 48,
    height: 48,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.ACCENT_PRIMARY,
  },
});
