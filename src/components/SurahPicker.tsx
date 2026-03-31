import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SurahSummary } from '../types/quran';
import { theme } from '../styles/theme';

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
  const [isOpen, setIsOpen] = useState(false);

  const selectedSurah = useMemo(
    () => surahs.find((surah) => surah.id === selectedSurahId) ?? null,
    [selectedSurahId, surahs]
  );

  if (isFetchingSurahs) {
    return (
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.selectorButton}>
          <ActivityIndicator color={theme.colors.ACCENT_PRIMARY} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.selectorButton, pressed && styles.selectorButtonPressed]}
          onPress={() => setIsOpen(true)}
          accessibilityRole="button"
        >
          <View style={styles.selectorTextWrap}>
            <Text style={styles.selectorTitle} numberOfLines={1}>
              {selectedSurah ? `${selectedSurah.id}. ${selectedSurah.name}` : '-'}
            </Text>
            {selectedSurah ? (
              <Text style={styles.selectorMeta} numberOfLines={1}>
                {selectedSurah.verse_count} ayet
              </Text>
            ) : null}
          </View>
          <Feather name="chevron-down" size={18} color={theme.colors.TEXT_MUTED} />
        </Pressable>
      </View>

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label ?? 'Sure'}</Text>
              <Pressable style={styles.closeButton} onPress={() => setIsOpen(false)}>
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
                      isSelected && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => {
                      onSurahChange(surah.id);
                      setIsOpen(false);
                    }}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {surah.id}. {surah.name}
                      </Text>
                      <Text style={styles.optionMeta}>{surah.verse_count} ayet</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  label: {
    color: theme.colors.TEXT_MUTED,
    fontSize: theme.fontSize.XS,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  selectorButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    borderRadius: theme.borderRadius.MEDIUM,
    backgroundColor: theme.colors.TERTIARY_BG,
    paddingHorizontal: 12,
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
    gap: 2,
  },
  selectorTitle: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: theme.fontSize.MD,
    fontWeight: '700',
  },
  selectorMeta: {
    color: theme.colors.TEXT_MUTED,
    fontSize: theme.fontSize.SM,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    padding: theme.spacing.LG,
  },
  modalCard: {
    maxHeight: '78%',
    borderRadius: theme.borderRadius.XLARGE,
    backgroundColor: theme.colors.SECONDARY_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_PRIMARY,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.BORDER_SECONDARY,
  },
  modalTitle: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: theme.fontSize.LG,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.CARD_BG,
  },
  options: {
    padding: 12,
    gap: 8,
  },
  optionRow: {
    minHeight: 56,
    borderRadius: theme.borderRadius.MEDIUM,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    backgroundColor: theme.colors.CARD_BG,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionRowSelected: {
    borderColor: theme.colors.ACCENT_PRIMARY,
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
    color: theme.colors.TEXT_PRIMARY,
    fontSize: theme.fontSize.MD,
    fontWeight: '700',
  },
  optionTitleSelected: {
    color: theme.colors.ACCENT_PRIMARY,
  },
  optionMeta: {
    color: theme.colors.TEXT_MUTED,
    fontSize: theme.fontSize.SM,
  },
});
