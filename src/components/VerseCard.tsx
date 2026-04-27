import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Verse } from '../types/quran';
import { useTheme } from '../hooks/useTheme';

type VerseCardProps = {
  verse: Verse;
  quranFontFamily: string;
  quranTextStyle: {
    fontSize: number;
    lineHeight: number;
  };
  showTranscription: boolean;
  isCurrentVerse?: boolean;
  onLongPress: (verse: Verse) => void;
  onPlayFromVerse: (verse: Verse) => void;
  playFromVerseText: string;
  showPlayAction: boolean;
};

export function VerseCard({
  verse,
  quranFontFamily,
  quranTextStyle,
  showTranscription,
  isCurrentVerse,
  onLongPress,
  onPlayFromVerse,
  playFromVerseText,
  showPlayAction,
}: VerseCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.verseCard,
        { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_PRIMARY },
        isCurrentVerse && { borderColor: theme.colors.ACCENT_PRIMARY, backgroundColor: theme.colors.TERTIARY_BG }
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Ayah ${verse.verse_number}`}
      accessibilityHint={isCurrentVerse ? 'Currently active ayah' : 'Hold for playback actions'}
      onLongPress={() => onLongPress(verse)}
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
          {verse.verse}
        </Text>
        {showTranscription ? (
          <Text style={[styles.transcriptionText, { color: theme.colors.TEXT_SECONDARY }]}>
            {verse.transcription}
          </Text>
        ) : null}
      </View>

      <View style={[styles.translationBlock, { borderTopColor: theme.colors.BORDER_PRIMARY }]}>
        <Text style={[styles.translationText, { color: theme.colors.TEXT_MUTED }]}>{verse.translation.text}</Text>
      </View>

      {showPlayAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.playActionButton,
            { backgroundColor: theme.colors.ACCENT_PRIMARY },
            pressed && { opacity: 0.82 },
          ]}
          onPress={() => onPlayFromVerse(verse)}
          accessibilityRole="button"
          accessibilityLabel={`${playFromVerseText}: ${verse.verse_number}`}
        >
          <Feather name="play" size={16} color="#fff" />
          <Text style={styles.playActionText}>{playFromVerseText}</Text>
        </Pressable>
      ) : null}
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
    gap: 8,
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
  transcriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  translationText: {
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '400',
  },
  playActionButton: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
  },
  playActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
