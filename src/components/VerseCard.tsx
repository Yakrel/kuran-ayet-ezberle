import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Verse } from '../types/quran';
import { useTheme } from '../hooks/useTheme';

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
  const { theme } = useTheme();

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
      style={[
        styles.verseCard,
        { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_PRIMARY },
        isCurrentVerse && { borderColor: theme.colors.ACCENT_PRIMARY, backgroundColor: theme.colors.TERTIARY_BG }
      ]}
      onPress={() => onPress(verse)}
      onLongPress={() => onLongPress(verse)}
      delayLongPress={500}
    >
      {isCurrentVerse ? <View style={[styles.activeMarker, { backgroundColor: theme.colors.ACCENT_PRIMARY }]} /> : null}

      <View style={styles.header}>
        <View style={[
          styles.numberBadge,
          { backgroundColor: theme.colors.DARK_BG, borderColor: theme.colors.BORDER_SECONDARY },
          isCurrentVerse && { backgroundColor: theme.colors.ACCENT_PRIMARY + '22', borderColor: theme.colors.ACCENT_PRIMARY }
        ]}>
          <Text style={[
            styles.verseNumber,
            { color: theme.colors.TEXT_TERTIARY },
            isCurrentVerse && { color: theme.colors.ACCENT_PRIMARY }
          ]}>
            {verse.verse_number}
          </Text>
        </View>
        <View style={[styles.line, { backgroundColor: theme.colors.BORDER_PRIMARY }]} />
      </View>

      <View style={styles.arabicBlock}>
        {wordLines.length > 0 ? (
          wordLines.map((lineWords, index) => (
            <Text
              key={`${verse.surah_id}-${verse.verse_number}-line-${index + 1}`}
              style={[styles.arabicText, { fontFamily: quranFontFamily, color: theme.colors.TEXT_PRIMARY }]}
            >
              {lineWords.map((word, wordIndex) => {
                const isActiveWord = activeWordLocation === word.location;
                const wordStyle = word.is_ayah_marker
                  ? { color: theme.colors.TEXT_TERTIARY }
                  : isActiveWord
                  ? { backgroundColor: theme.colors.ACCENT_PRIMARY + '38', color: theme.colors.ACCENT_PRIMARY }
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
          <Text style={[styles.arabicText, { fontFamily: quranFontFamily, color: theme.colors.TEXT_PRIMARY }]}>{verse.verse}</Text>
        )}
      </View>

      <View style={[styles.translationBlock, { borderTopColor: theme.colors.BORDER_PRIMARY }]}>
        <Text style={[styles.translationText, { color: theme.colors.TEXT_MUTED }]}>{verse.translation.text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  verseCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    gap: 16,
    overflow: 'hidden',
  },
  activeMarker: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    right: 0,
    width: 2,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  verseNumber: {
    fontWeight: '800',
    fontSize: 10,
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  arabicBlock: {
    gap: 4,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 22,
    lineHeight: 36,
    fontWeight: '400',
  },
  translationBlock: {
    paddingTop: 8,
    borderTopWidth: 1,
  },
  translationText: {
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '400',
  },
});
