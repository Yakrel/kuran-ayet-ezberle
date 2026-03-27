import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Verse } from '../types/quran';
import { theme } from '../styles/theme';

type VerseCardProps = {
  verse: Verse;
  quranFontFamily: string;
  isCurrentVerse?: boolean;
  onPress: (verse: Verse) => void;
  onLongPress: (verse: Verse) => void;
};

export function VerseCard({
  verse,
  quranFontFamily,
  isCurrentVerse,
  onPress,
  onLongPress,
}: VerseCardProps) {
  return (
    <Pressable
      style={styles.verseCard}
      onPress={() => onPress(verse)}
      onLongPress={() => onLongPress(verse)}
      delayLongPress={500}
    >
      {isCurrentVerse ? <View style={styles.activeMarker} /> : null}

      <View style={styles.header}>
        <View style={[styles.numberBadge, isCurrentVerse && styles.currentNumberBadge]}>
          <Text style={[styles.verseNumber, isCurrentVerse && styles.currentVerseNumber]}>
            {verse.verse_number}
          </Text>
        </View>
        <View style={styles.line} />
      </View>

      <Text style={[styles.arabicText, { fontFamily: quranFontFamily }]}>{verse.verse}</Text>
      
      <Text style={styles.translationText}>{verse.translation.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  verseCard: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: theme.colors.TERTIARY_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_PRIMARY,
    gap: 7,
    overflow: 'hidden',
  },
  activeMarker: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    right: 0,
    width: 4,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    backgroundColor: theme.colors.ACCENT_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
  },
  currentNumberBadge: {
    backgroundColor: theme.colors.ACCENT_PRIMARY,
    borderColor: theme.colors.ACCENT_PRIMARY,
  },
  verseNumber: {
    color: theme.colors.TEXT_TERTIARY,
    fontWeight: '800',
    fontSize: 11,
  },
  currentVerseNumber: {
    color: theme.colors.TEXT_PRIMARY,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.BORDER_PRIMARY,
    opacity: 0.3,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 26,
    lineHeight: 38,
    fontWeight: '400',
  },
  translationText: {
    color: theme.colors.TEXT_MUTED,
    lineHeight: 18,
    fontSize: 13,
    fontWeight: '400',
  },
});
