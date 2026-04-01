import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { onlyDigits } from '../utils/parsers';

type PlaybackControlsProps = {
  startVerseInput: string;
  endVerseInput: string;
  repeatCountInput: string;
  onStartVerseChange: (value: string) => void;
  onEndVerseChange: (value: string) => void;
  onRepeatCountChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  startVerseText: string;
  endVerseText: string;
  startText: string;
  stopText: string;
  repeatText: string;
};

export function PlaybackControls({
  startVerseInput,
  endVerseInput,
  repeatCountInput,
  onStartVerseChange,
  onEndVerseChange,
  onRepeatCountChange,
  onStart,
  onStop,
  startVerseText,
  endVerseText,
  startText,
  stopText,
  repeatText,
}: PlaybackControlsProps) {
  const { theme, themeType } = useTheme();

  return (
    <View style={styles.playbackContainer}>
      <View style={styles.inputsRow}>
        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: themeType === 'DARK' ? 'rgba(2, 6, 23, 0.72)' : 'rgba(253, 246, 227, 0.72)',
              borderColor: theme.colors.BORDER_SECONDARY,
            },
          ]}
        >
          <View style={styles.inputCardHeader}>
            <Text style={[styles.inputLabel, { color: theme.colors.TEXT_TERTIARY }]}>{startVerseText}</Text>
            <Feather name="corner-down-right" size={14} color={theme.colors.TEXT_MUTED} />
          </View>
          <TextInput
            value={startVerseInput}
            onChangeText={(text) => onStartVerseChange(onlyDigits(text))}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.colors.TEXT_PRIMARY }]}
            placeholder="1"
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />
        </View>

        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: themeType === 'DARK' ? 'rgba(2, 6, 23, 0.72)' : 'rgba(253, 246, 227, 0.72)',
              borderColor: theme.colors.BORDER_SECONDARY,
            },
          ]}
        >
          <View style={styles.inputCardHeader}>
            <Text style={[styles.inputLabel, { color: theme.colors.TEXT_TERTIARY }]}>{endVerseText}</Text>
            <Feather name="corner-up-right" size={14} color={theme.colors.TEXT_MUTED} />
          </View>
          <TextInput
            value={endVerseInput}
            onChangeText={(text) => onEndVerseChange(onlyDigits(text))}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.colors.TEXT_PRIMARY }]}
            placeholder="1"
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />
        </View>

        <View
          style={[
            styles.inputCard,
            styles.repeatCard,
            {
              backgroundColor: themeType === 'DARK' ? 'rgba(2, 6, 23, 0.72)' : 'rgba(253, 246, 227, 0.72)',
              borderColor: theme.colors.BORDER_SECONDARY,
            },
          ]}
        >
          <View style={styles.inputCardHeader}>
            <Text style={[styles.inputLabel, { color: theme.colors.TEXT_TERTIARY }]}>{repeatText}</Text>
            <Feather name="repeat" size={14} color={theme.colors.TEXT_MUTED} />
          </View>
          <TextInput
            value={repeatCountInput}
            onChangeText={(text) => onRepeatCountChange(onlyDigits(text))}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.colors.TEXT_PRIMARY }]}
            placeholder="1"
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />
        </View>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.colors.ACCENT_PRIMARY, borderColor: theme.colors.BORDER_ACCENT },
            pressed && styles.controlButtonPressed,
          ]}
          onPress={onStart}
          accessibilityRole="button"
        >
          <Feather name="play" size={18} color={themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff'} />
          <Text style={[styles.startButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>{startText}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY },
            pressed && styles.controlButtonPressed,
          ]}
          onPress={onStop}
          accessibilityRole="button"
        >
          <Feather name="square" size={16} color={theme.colors.TEXT_SECONDARY} />
          <Text style={[styles.stopButtonText, { color: theme.colors.TEXT_SECONDARY }]}>{stopText}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playbackContainer: {
    gap: 8,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  inputCard: {
    flexBasis: '31%',
    flexGrow: 1,
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  repeatCard: {
    minWidth: 84,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 22,
    textAlign: 'left',
    fontWeight: '800',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  controlButtonPressed: {
    opacity: 0.8,
  },
  startButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  stopButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
