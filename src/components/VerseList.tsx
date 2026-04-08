import React, { useRef, useEffect } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, type ViewToken } from 'react-native';
import type { Verse } from '../types/quran';
import type { VerseLocation } from '../types/navigation';
import { VerseCard } from './VerseCard';
import { PageHeader } from './PageHeader';
import { useTheme } from '../hooks/useTheme';
import { UI_CONFIG } from '../constants/gestures';
import { getAutoScrollTargetIndex } from '../utils/getAutoScrollTargetIndex';

type VerseListProps = {
  currentPage: number;
  currentPageVerses: Verse[];
  currentVerse: Verse | null;
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
  currentPage,
  currentPageVerses,
  currentVerse,
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
  const { theme } = useTheme();
  const verseListRef = useRef<FlatList<Verse> | null>(null);
  const visibleIndexesRef = useRef<number[]>([]);
  const lastAutoScrollIndexRef = useRef<number | null>(null);
  
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: UI_CONFIG.VERSE_VISIBILITY_THRESHOLD,
  });

  // Auto-scroll to active verse
  useEffect(() => {
    if (!autoScrollEnabled) {
      return;
    }

    if (!currentVerse) {
      return;
    }

    const activeIndex = currentPageVerses.findIndex((verse) => verse.verse_number === currentVerse.verse_number);
    if (activeIndex === -1) {
      return;
    }

    const targetIndex = getAutoScrollTargetIndex(activeIndex, visibleIndexesRef.current);
    if (targetIndex === null || lastAutoScrollIndexRef.current === targetIndex) {
      return;
    }

    lastAutoScrollIndexRef.current = targetIndex;
    verseListRef.current?.scrollToIndex({
      index: targetIndex,
      animated: false,
      viewPosition: 0.3,
    });
  }, [autoScrollEnabled, currentVerse, currentPageVerses]);

  useEffect(() => {
    visibleIndexesRef.current = [];
    lastAutoScrollIndexRef.current = null;
  }, [currentPageVerses]);
  
  const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleItems = viewableItems.filter((item) => item.isViewable);
    visibleIndexesRef.current = visibleItems
      .map((item) => item.index)
      .filter((index): index is number => typeof index === 'number');

    const firstVisible = visibleItems[0]?.item as Verse | undefined;
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
      {sectionTitle || pageProgressText ? (
        <PageHeader title={sectionTitle} pageProgressText={pageProgressText} />
      ) : null}
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
                quranTextStyle={quranTextStyle}
                isCurrentVerse={isCurrent}
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
    marginBottom: 16,
  },
  pageBody: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    gap: 12,
    paddingTop: 2,
  },
  pageHint: {
    marginTop: 8,
    fontSize: 10,
    marginHorizontal: 12,
    letterSpacing: 0.2,
  },
});
