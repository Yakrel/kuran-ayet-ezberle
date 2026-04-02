import React, { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Verse } from '../types/quran';
import { useTheme } from '../hooks/useTheme';

type VerseCardProps = {
  verse: Verse;
  quranFontFamily: string;
  quranTextStyle: {
    fontSize: number;
    lineHeight: number;
  };
  isCurrentVerse?: boolean;
  activeWordLocation?: string | null;
  onPress: (verse: Verse) => void;
  onLongPress: (verse: Verse) => void;
};

export function VerseCard({
  verse,
  quranFontFamily,
  quranTextStyle,
  isCurrentVerse,
  activeWordLocation,
  onPress,
  onLongPress,
}: VerseCardProps) {
  const { theme } = useTheme();
  const longPressTriggeredRef = useRef(false);
  const highlightedVerseText = useMemo(() => {
    if (!isCurrentVerse || !activeWordLocation) {
      return verse.verse;
    }

    const activeWord = verse.words.find((word) => word.location === activeWordLocation);
    if (!activeWord) {
      return verse.verse;
    }

    return verse.verse;
  }, [activeWordLocation, isCurrentVerse, verse.verse, verse.words]);

  return (
    <Pressable
      style={[
        styles.verseCard,
        { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_PRIMARY },
        isCurrentVerse && { borderColor: theme.colors.ACCENT_PRIMARY, backgroundColor: theme.colors.TERTIARY_BG }
      ]}
      onPress={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }

        onPress(verse);
      }}
      onLongPress={() => {
        longPressTriggeredRef.current = true;
        onLongPress(verse);
      }}
      delayLongPress={500}
    >
      {isCurrentVerse ? <View style={[styles.activeMarker, { backgroundColor: theme.colors.ACCENT_PRIMARY }]} /> : null}

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

      <View style={styles.arabicBlock}>
        <Text
          style={[
            styles.arabicText,
            quranTextStyle,
            { fontFamily: quranFontFamily, color: theme.colors.TEXT_PRIMARY }
          ]}
        >
          {highlightedVerseText}
        </Text>
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
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
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
  numberBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 6,
    zIndex: 10,
  },
  verseNumber: {
    fontWeight: '800',
    fontSize: 10,
  },
  arabicBlock: {
    gap: 4,
    paddingLeft: 40,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
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
