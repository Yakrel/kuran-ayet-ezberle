import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Verse } from '../types/quran';
import { theme } from '../styles/theme';

type VerseCardProps = {
  verse: Verse;
  quranFontFamily: string;
  isCurrentVerse?: boolean;
  activeWordLocation?: string | null;
  onPress: (verse: Verse) => void;
  onLongPress: (verse: Verse) => void;
};

export function VerseCard({
  verse,
  quranFontFamily,
  isCurrentVerse,
  activeWordLocation,
  onPress,
  onLongPress,
}: VerseCardProps) {
  const wordLines = useMemo(() => {
    const lines = new Map<number, typeof verse.words>();
    for (const word of verse.words) {
      const current = lines.get(word.line_number) ?? [];
      current.push(word);
      lines.set(word.line_number, current);
    }

    return Array.from(lines.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([, words]) => words);
  }, [verse.words]);

  return (
    <Pressable
      style={[styles.verseCard, isCurrentVerse && styles.currentVerseCard]}
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

      <View style={styles.arabicBlock}>
        {wordLines.length > 0 ? (
          wordLines.map((lineWords, index) => (
            <Text
              key={`${verse.surah_id}-${verse.verse_number}-line-${index + 1}`}
              style={[styles.arabicText, { fontFamily: quranFontFamily }]}
            >
              {lineWords.map((word, wordIndex) => {
                const isActiveWord = activeWordLocation === word.location;
                const wordStyle = word.is_ayah_marker
                  ? styles.ayahMarker
                  : isActiveWord
                  ? styles.activeWord
                  : undefined;

                return (
                  <Text
                    key={word.location}
                    style={wordStyle}
                  >
                    {word.text}
                    {wordIndex === lineWords.length - 1 ? '' : ' '}
                  </Text>
                );
              })}
            </Text>
          ))
        ) : (
          <Text style={[styles.arabicText, { fontFamily: quranFontFamily }]}>{verse.verse}</Text>
        )}
      </View>

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
    gap: 9,
    overflow: 'hidden',
  },
  currentVerseCard: {
    borderColor: theme.colors.ACCENT_PRIMARY,
    backgroundColor: theme.colors.CARD_BG,
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
  arabicBlock: {
    gap: 2,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 26,
    lineHeight: 38,
    fontWeight: '400',
  },
  activeWord: {
    backgroundColor: 'rgba(13, 148, 136, 0.22)',
    color: theme.colors.ACCENT_PRIMARY,
  },
  ayahMarker: {
    color: theme.colors.TEXT_TERTIARY,
  },
  translationText: {
    color: theme.colors.TEXT_MUTED,
    lineHeight: 18,
    fontSize: 13,
    fontWeight: '400',
  },
});
