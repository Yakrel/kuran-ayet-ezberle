import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SurahSummary } from '../types/quran';
import type { TranslationStrings } from '../i18n/types';
import { useTheme } from '../hooks/useTheme';

type SurahPickerProps = {
  surahs: SurahSummary[];
  selectedSurahId: number | null;
  isFetchingSurahs: boolean;
  onSurahChange: (surahId: number | string) => void;
  text: Pick<TranslationStrings, 'surah' | 'searchSurah' | 'noSurahResults' | 'ayahUnit'>;
};

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function SurahPicker({
  surahs,
  selectedSurahId,
  isFetchingSurahs,
  onSurahChange,
  text,
}: SurahPickerProps) {
  const { theme, themeType } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedSurah = useMemo(
    () => surahs.find((surah) => surah.id === selectedSurahId) ?? null,
    [selectedSurahId, surahs]
  );

  const filteredSurahs = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim());
    if (!normalizedQuery) {
      return surahs;
    }

    return surahs.filter((surah) => {
      const idMatch = String(surah.id).includes(normalizedQuery);
      const nameMatch = normalizeSearchText(surah.name).includes(normalizedQuery);
      return idMatch || nameMatch;
    });
  }, [query, surahs]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (isFetchingSurahs) {
    return (
      <View style={[styles.selectorButton, { backgroundColor: theme.colors.TERTIARY_BG, borderColor: theme.colors.BORDER_SECONDARY }]}>
        <ActivityIndicator color={theme.colors.ACCENT_PRIMARY} />
      </View>
    );
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.selectorButton, 
          { backgroundColor: theme.colors.TERTIARY_BG, borderColor: theme.colors.BORDER_SECONDARY },
          pressed && styles.selectorButtonPressed
        ]}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
      >
        <Text style={[styles.selectorTitle, { color: theme.colors.TEXT_PRIMARY }]} numberOfLines={1}>
          {selectedSurah ? `${selectedSurah.id}. ${selectedSurah.name}` : '-'}
        </Text>
        <Feather name="chevron-down" size={16} color={theme.colors.TEXT_MUTED} />
      </Pressable>

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={() => setIsOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: themeType === 'DARK' ? 'rgba(2, 6, 23, 0.72)' : 'rgba(7, 54, 66, 0.4)' }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.BORDER_SECONDARY }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.surah}</Text>
              <Pressable style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]} onPress={() => setIsOpen(false)}>
                <Feather name="x" size={20} color={theme.colors.TEXT_PRIMARY} />
              </Pressable>
            </View>

            <View style={[styles.searchWrap, { borderBottomColor: theme.colors.BORDER_SECONDARY }]}>
              <View style={[styles.searchInputWrap, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}>
                <Feather name="search" size={16} color={theme.colors.TEXT_MUTED} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={text.searchSurah}
                  placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
                  style={[styles.searchInput, { color: theme.colors.TEXT_PRIMARY }]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.options}>
              {filteredSurahs.map((surah) => {
                const isSelected = surah.id === selectedSurahId;

                return (
                  <Pressable
                    key={surah.id}
                    style={({ pressed }) => [
                      styles.optionRow,
                      { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY },
                      isSelected && { borderColor: theme.colors.ACCENT_PRIMARY },
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => {
                      onSurahChange(surah.id);
                      setIsOpen(false);
                    }}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[
                        styles.optionTitle, 
                        { color: theme.colors.TEXT_PRIMARY },
                        isSelected && { color: theme.colors.ACCENT_PRIMARY }
                      ]}>
                        {surah.id}. {surah.name}
                      </Text>
                      <Text style={[styles.optionMeta, { color: theme.colors.TEXT_MUTED }]}>{surah.verse_count} {text.ayahUnit}</Text>
                    </View>
                    {isSelected ? (
                      <Feather name="check" size={18} color={theme.colors.ACCENT_PRIMARY} />
                    ) : null}
                  </Pressable>
                );
              })}
              {filteredSurahs.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}>
                  <Text style={[styles.emptyStateText, { color: theme.colors.TEXT_MUTED }]}>{text.noSurahResults}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  selectorButton: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  selectorButtonPressed: {
    opacity: 0.85,
  },
  selectorTitle: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    flex: 1,
    minWidth: 0,
  },
  selectorMeta: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    maxHeight: '78%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  searchInputWrap: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  options: {
    padding: 12,
    gap: 8,
  },
  optionRow: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionRowPressed: {
    opacity: 0.85,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionMeta: {
    fontSize: 14,
  },
  emptyState: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
