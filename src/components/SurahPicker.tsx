import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SurahSummary } from '../types/quran';
import { useTheme } from '../hooks/useTheme';

type SurahPickerProps = {
  surahs: SurahSummary[];
  selectedSurahId: number | null;
  isFetchingSurahs: boolean;
  onSurahChange: (surahId: number | string) => void;
  label?: string;
};

export function SurahPicker({
  surahs,
  selectedSurahId,
  isFetchingSurahs,
  onSurahChange,
  label,
}: SurahPickerProps) {
  const { theme, themeType } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedSurah = useMemo(
    () => surahs.find((surah) => surah.id === selectedSurahId) ?? null,
    [selectedSurahId, surahs]
  );

  if (isFetchingSurahs) {
    return (
      <View style={styles.container}>
        {label ? <Text style={[styles.label, { color: theme.colors.TEXT_MUTED }]}>{label}</Text> : null}
        <View style={[styles.selectorButton, { backgroundColor: theme.colors.TERTIARY_BG, borderColor: theme.colors.BORDER_SECONDARY }]}>
          <ActivityIndicator color={theme.colors.ACCENT_PRIMARY} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {label ? <Text style={[styles.label, { color: theme.colors.TEXT_MUTED }]}>{label}</Text> : null}
        <Pressable
          style={({ pressed }) => [
            styles.selectorButton, 
            { backgroundColor: theme.colors.TERTIARY_BG, borderColor: theme.colors.BORDER_SECONDARY },
            pressed && styles.selectorButtonPressed
          ]}
          onPress={() => setIsOpen(true)}
          accessibilityRole="button"
        >
          <View style={styles.selectorTextWrap}>
            <Text style={[styles.selectorTitle, { color: theme.colors.TEXT_PRIMARY }]} numberOfLines={1}>
              {selectedSurah ? `${selectedSurah.id}. ${selectedSurah.name}` : '-'}
            </Text>
            {selectedSurah ? (
              <Text style={[styles.selectorMeta, { color: theme.colors.TEXT_MUTED }]} numberOfLines={1}>
                {selectedSurah.verse_count} ayet
              </Text>
            ) : null}
          </View>
          <Feather name="chevron-down" size={18} color={theme.colors.TEXT_MUTED} />
        </Pressable>
      </View>

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={() => setIsOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: themeType === 'DARK' ? 'rgba(2, 6, 23, 0.72)' : 'rgba(7, 54, 66, 0.4)' }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.BORDER_SECONDARY }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{label ?? 'Sure'}</Text>
              <Pressable style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]} onPress={() => setIsOpen(false)}>
                <Feather name="x" size={20} color={theme.colors.TEXT_PRIMARY} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.options}>
              {surahs.map((surah) => {
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
                      <Text style={[styles.optionMeta, { color: theme.colors.TEXT_MUTED }]}>{surah.verse_count} ayet</Text>
                    </View>
                    {isSelected ? (
                      <Feather name="check" size={18} color={theme.colors.ACCENT_PRIMARY} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  selectorButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectorButtonPressed: {
    opacity: 0.85,
  },
  selectorTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  selectorMeta: {
    fontSize: 11,
    fontWeight: '600',
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
});
