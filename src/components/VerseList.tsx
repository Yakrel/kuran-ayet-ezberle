import React, { useRef, useEffect } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, type ViewToken } from 'react-native';
import type { Verse } from '../types/quran';
import type { VerseLocation } from '../types/navigation';
import { VerseCard } from './VerseCard';
import { PageHeader } from './PageHeader';
import { useTheme } from '../hooks/useTheme';
import { UI_CONFIG } from '../constants/gestures';

type VerseListProps = {
  currentPageVerses: Verse[];
  currentVerse: Verse | null;
  activeWordLocation?: string | null;
  quranFontFamily: string;
  quranTextStyle: {
    fontSize: number;
    lineHeight: number;
  };
  sectionTitle: string;
  pageProgressText: string;
  swipeHintText: string;
  autoScrollEnabled: boolean;
  onVerseTap: (verse: Verse) => void;
  onVerseLongPress: (verse: Verse) => void;
  onVisibleVerseChange: (location: VerseLocation) => void;
  panHandlers: ReturnType<typeof import('react-native').PanResponder.create>['panHandlers'];
};

export function VerseList({
  currentPageVerses,
  currentVerse,
  activeWordLocation,
  quranFontFamily,
  quranTextStyle,
  sectionTitle,
  pageProgressText,
  swipeHintText,
  autoScrollEnabled,
  onVerseTap,
  onVerseLongPress,
  onVisibleVerseChange,
  panHandlers,
}: VerseListProps) {
  const { theme, themeType } = useTheme();
  const verseListRef = useRef<FlatList<Verse> | null>(null);
  
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: UI_CONFIG.VERSE_VISIBILITY_THRESHOLD,
  });

  // Auto-scroll to active verse
  useEffect(() => {
    if (!autoScrollEnabled) {
      return;
    }
    if (currentVerse && currentPageVerses.some(v => v.verse_number === currentVerse.verse_number)) {
      const index = currentPageVerses.findIndex(v => v.verse_number === currentVerse.verse_number);
      if (index !== -1) {
        verseListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.3, // Keep it near the top-middle
        });
      }
    }
  }, [autoScrollEnabled, currentVerse, currentPageVerses]);
  
  const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const firstVisible = viewableItems.find((item) => item.isViewable)?.item as Verse | undefined;
    if (!firstVisible) {
      return;
    }
    onVisibleVerseChange({
      surah_id: firstVisible.surah_id,
      verse_number: firstVisible.verse_number,
      page: firstVisible.page,
    });
  });

  return (
    <View style={[
      styles.listContainer, 
      { 
        backgroundColor: themeType === 'DARK' ? 'rgba(8, 15, 28, 0.86)' : 'rgba(255, 252, 245, 0.84)',
        borderColor: themeType === 'DARK' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(7, 54, 66, 0.12)'
      }
    ]}>
      {sectionTitle || pageProgressText ? (
        <PageHeader title={sectionTitle} pageProgressText={pageProgressText} />
      ) : null}
      <View style={styles.pageBody} {...panHandlers}>
        <FlatList
          key={`page-${pageProgressText}`}
          ref={verseListRef}
          data={currentPageVerses}
          keyExtractor={(item) => `${item.surah_id}-${item.verse_number}`}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={() => undefined}
          viewabilityConfig={viewabilityConfigRef.current}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => {
            const isCurrent =
              currentVerse?.surah_id === item.surah_id &&
              currentVerse?.verse_number === item.verse_number;

            return (
              <VerseCard
                verse={item}
                quranFontFamily={quranFontFamily}
                quranTextStyle={quranTextStyle}
                isCurrentVerse={isCurrent}
                activeWordLocation={isCurrent ? activeWordLocation : null}
                onPress={onVerseTap}
                onLongPress={onVerseLongPress}
              />
            );
          }}
        />
      </View>
      <Text style={[styles.pageHint, { color: theme.colors.TEXT_MUTED }]}>{swipeHintText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  pageBody: {
    flex: 1,
    borderRadius: 16,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
    paddingTop: 2,
  },
  pageHint: {
    marginTop: 8,
    fontSize: 10,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
});
