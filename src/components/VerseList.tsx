import React, { useRef, useEffect } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, type ViewToken } from 'react-native';
import type { Verse } from '../types/quran';
import type { VerseLocation } from '../types/navigation';
import { VerseCard } from './VerseCard';
import { PageHeader } from './PageHeader';
import { theme } from '../styles/theme';
import { UI_CONFIG } from '../constants/gestures';

type VerseListProps = {
  currentPageVerses: Verse[];
  currentVerse: Verse | null;
  activeWordLocation?: string | null;
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
  activeWordLocation,
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
                activeWordLocation={isCurrent ? activeWordLocation : null}
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
    marginHorizontal: theme.spacing.LG,
    marginBottom: theme.spacing.LG,
    borderRadius: 30,
    backgroundColor: 'rgba(6, 16, 32, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    paddingHorizontal: theme.spacing.MD,
    paddingTop: 10,
    paddingBottom: 92,
    overflow: 'hidden',
  },
  pageBody: {
    flex: 1,
    borderRadius: theme.borderRadius.LARGE,
  },
  listContent: {
    paddingBottom: 32,
    gap: 14,
    paddingTop: 8,
  },
  pageHint: {
    marginTop: 6,
    color: theme.colors.TEXT_MUTED,
    fontSize: theme.fontSize.XS,
    marginLeft: 6,
  },
});
