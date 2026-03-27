import React, { useRef, useEffect } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, type ViewToken } from 'react-native';
import type { Verse } from '../types/quran';
import type { VerseLocation } from '../reducers/types';
import { VerseCard } from './VerseCard';
import { PageHeader } from './PageHeader';
import { theme } from '../styles/theme';
import { UI_CONFIG } from '../constants/gestures';

type VerseListProps = {
  currentPageVerses: Verse[];
  currentVerse: Verse | null;
  quranFontFamily: string;
  currentPage: number;
  pageText: string;
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
  quranFontFamily,
  currentPage,
  pageText,
  pageProgressText,
  swipeHintText,
  autoScrollEnabled,
  onVerseTap,
  onVerseLongPress,
  onVisibleVerseChange,
  panHandlers,
}: VerseListProps) {
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
    <View style={styles.listContainer}>
      <PageHeader pageText={pageText} currentPage={currentPage} pageProgressText={pageProgressText} />
      <View style={styles.pageBody} {...panHandlers}>
        <FlatList
          key={`page-${currentPage}`}
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
                isCurrentVerse={isCurrent}
                onPress={onVerseTap}
                onLongPress={onVerseLongPress}
              />
            );
          }}
        />
      </View>
      <Text style={styles.pageHint}>{swipeHintText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    marginTop: theme.spacing.SM,
    marginHorizontal: theme.spacing.XL,
    marginBottom: theme.spacing.LG,
    borderRadius: theme.borderRadius.XXLARGE,
    backgroundColor: theme.colors.SECONDARY_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_PRIMARY,
    paddingHorizontal: theme.spacing.MD,
    paddingTop: 6,
    paddingBottom: 80, // Space for BottomPlayerBar
  },
  pageBody: {
    flex: 1,
    borderRadius: theme.borderRadius.LARGE,
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  pageHint: {
    marginTop: theme.spacing.SM,
    color: theme.colors.TEXT_MUTED,
    fontSize: theme.fontSize.SM,
    marginLeft: 2,
  },
});
