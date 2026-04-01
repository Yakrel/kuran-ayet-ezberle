import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

type InlineRangeSelectorProps = {
  startVerse: string;
  endVerse: string;
  repeatCount: string;
  onStartPress: () => void;
  onEndPress: () => void;
  onRepeatPress: () => void;
  startLabel: string;
  endLabel: string;
  repeatLabel: string;
};

export function InlineRangeSelector({
  startVerse,
  endVerse,
  repeatCount,
  onStartPress,
  onEndPress,
  onRepeatPress,
  startLabel,
  endLabel,
  repeatLabel,
}: InlineRangeSelectorProps) {
  const { theme, themeType } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.inputPill,
          {
            backgroundColor: themeType === 'DARK' ? 'rgba(5, 150, 105, 0.16)' : 'rgba(42, 161, 152, 0.14)',
            borderColor: theme.colors.BORDER_SECONDARY,
          },
        ]}
        onPress={onStartPress}
      >
        <Text style={[styles.pillLabel, { color: theme.colors.TEXT_TERTIARY }]}>{startLabel}</Text>
        <Text style={[styles.pillValue, { color: theme.colors.TEXT_PRIMARY }]}>{startVerse}</Text>
      </Pressable>

      <View style={styles.arrow}>
        <Feather name="arrow-right" size={14} color={theme.colors.TEXT_MUTED} />
      </View>

      <Pressable
        style={[
          styles.inputPill,
          {
            backgroundColor: themeType === 'DARK' ? 'rgba(5, 150, 105, 0.16)' : 'rgba(42, 161, 152, 0.14)',
            borderColor: theme.colors.BORDER_SECONDARY,
          },
        ]}
        onPress={onEndPress}
      >
        <Text style={[styles.pillLabel, { color: theme.colors.TEXT_TERTIARY }]}>{endLabel}</Text>
        <Text style={[styles.pillValue, { color: theme.colors.TEXT_PRIMARY }]}>{endVerse}</Text>
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={[
          styles.inputPill,
          styles.repeatPill,
          {
            backgroundColor: themeType === 'DARK' ? 'rgba(96, 165, 250, 0.16)' : 'rgba(38, 139, 210, 0.14)',
            borderColor: theme.colors.BORDER_SECONDARY,
          },
        ]}
        onPress={onRepeatPress}
      >
        <Feather name="repeat" size={12} color={theme.colors.ACCENT_PRIMARY} />
        <Text style={[styles.pillValue, { color: theme.colors.TEXT_PRIMARY }]}>{repeatCount}×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 50,
  },
  repeatPill: {
    gap: 4,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pillValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  arrow: {
    marginHorizontal: -2,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginHorizontal: 2,
  },
});
