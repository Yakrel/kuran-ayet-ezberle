import React from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';

type BottomPlayerBarProps = {
  playbackState: 'idle' | 'playing' | 'stopped';
  currentVerseText?: string;
  activeLocationText: string;
  onStop: () => void;
  onStart: () => void;
  isPreparingAudio: boolean;
  progressText?: string;
  readyToStartText: string;
};

export function BottomPlayerBar({
  playbackState,
  currentVerseText,
  activeLocationText,
  onStop,
  onStart,
  isPreparingAudio,
  progressText,
  readyToStartText,
}: BottomPlayerBarProps) {
  const isPlaying = playbackState === 'playing';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.locationText} numberOfLines={1}>
            {activeLocationText}
          </Text>
          {isPlaying && currentVerseText ? (
            <Text style={styles.verseText}>{currentVerseText}</Text>
          ) : (
            <Text style={styles.idleText}>{readyToStartText}</Text>
          )}
        </View>

        <View style={styles.controlsSection}>
          {isPreparingAudio ? (
            <ActivityIndicator color={theme.colors.ACCENT_PRIMARY} style={styles.loader} />
          ) : (
            <Pressable
              style={[styles.playButton, isPlaying ? styles.stopButton : styles.startButton]}
              onPress={isPlaying ? onStop : onStart}
            >
              <Feather 
                name={isPlaying ? "square" : "play"} 
                size={24} 
                color={theme.colors.TEXT_PRIMARY} 
              />
            </Pressable>
          )}
        </View>
      </View>
      
      {/* Mini Progress Bar if playing */}
      {isPlaying && progressText && (
        <View style={styles.progressBarBackground}>
          <View style={styles.progressBarFill} />
        </View>
      )}
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
    height: 70,
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
  idleText: {
    color: theme.colors.TEXT_MUTED,
    fontSize: 15,
    fontWeight: '500',
  },
  controlsSection: {
    marginLeft: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.ACCENT_PRIMARY,
  },
  startButton: {
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
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.ACCENT_PRIMARY,
    width: '40%', // We can calculate this later based on current repeat/verse
  }
});
