import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../styles/theme';
import { onlyDigits } from '../utils/parsers';

type PlaybackControlsProps = {
  startVerseInput: string;
  verseCountInput: string;
  repeatCountInput: string;
  onStartVerseChange: (value: string) => void;
  onVerseCountChange: (value: string) => void;
  onRepeatCountChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  startText: string;
  stopText: string;
  startVerseText: string;
  verseCountText: string;
  repeatText: string;
};

export function PlaybackControls({
  startVerseInput,
  verseCountInput,
  repeatCountInput,
  onStartVerseChange,
  onVerseCountChange,
  onRepeatCountChange,
  onStart,
  onStop,
  startText,
  stopText,
  startVerseText,
  verseCountText,
  repeatText,
}: PlaybackControlsProps) {
  return (
    <View style={styles.playbackContainer}>
      <View style={styles.inputsRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{startVerseText}</Text>
          <TextInput
            value={startVerseInput}
            onChangeText={(text) => onStartVerseChange(onlyDigits(text))}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="1"
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{verseCountText}</Text>
          <TextInput
            value={verseCountInput}
            onChangeText={(text) => onVerseCountChange(onlyDigits(text))}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="1"
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{repeatText}</Text>
          <TextInput
            value={repeatCountInput}
            onChangeText={(text) => onRepeatCountChange(onlyDigits(text))}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="1"
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />
        </View>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            styles.startButton,
            pressed && styles.controlButtonPressed,
          ]}
          onPress={onStart}
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>{startText}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            styles.stopButton,
            pressed && styles.controlButtonPressed,
          ]}
          onPress={onStop}
          accessibilityRole="button"
        >
          <Text style={styles.stopButtonText}>{stopText}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playbackContainer: {
    gap: theme.spacing.MD,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: theme.spacing.MD,
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: theme.fontSize.XS,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.TERTIARY_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    borderRadius: theme.borderRadius.SMALL,
    color: theme.colors.TEXT_PRIMARY,
    padding: theme.spacing.SM,
    fontSize: theme.fontSize.MD,
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.MD,
  },
  controlButton: {
    flex: 1,
    paddingVertical: theme.spacing.MD,
    borderRadius: theme.borderRadius.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: theme.colors.SUCCESS_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_ACCENT,
  },
  stopButton: {
    backgroundColor: theme.colors.CARD_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
  },
  controlButtonPressed: {
    opacity: 0.8,
  },
  startButtonText: {
    color: theme.colors.TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: theme.fontSize.MD,
  },
  stopButtonText: {
    color: theme.colors.TEXT_SECONDARY,
    fontWeight: '700',
    fontSize: theme.fontSize.MD,
  },
});
