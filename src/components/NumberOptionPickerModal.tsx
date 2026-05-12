import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export type NumberPickerOption = {
  label: string;
  value: number;
  icon?: FeatherIconName;
};

type NumberOptionPickerModalProps = {
  visible: boolean;
  title: string;
  selectedValue: number | null;
  options: NumberPickerOption[];
  featuredOptions?: NumberPickerOption[];
  onClose: () => void;
  onSelect: (value: number) => void;
};

export function NumberOptionPickerModal({
  visible,
  title,
  selectedValue,
  options,
  featuredOptions = [],
  onClose,
  onSelect,
}: NumberOptionPickerModalProps) {
  const { theme, themeType } = useTheme();

  function handleSelect(value: number) {
    onSelect(value);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: themeType === 'DARK' ? 'rgba(2, 6, 23, 0.72)' : 'rgba(7, 54, 66, 0.4)' }]}>
        <View style={[styles.content, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.BORDER_SECONDARY }]}>
            <Text allowFontScaling={false} style={[styles.title, { color: theme.colors.TEXT_PRIMARY }]}>{title}</Text>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]}>
              <Feather name="x" size={20} color={theme.colors.TEXT_PRIMARY} />
            </Pressable>
          </View>

          {featuredOptions.length > 0 ? (
            <View style={[styles.featuredRow, { borderBottomColor: theme.colors.BORDER_SECONDARY }]}>
              {featuredOptions.map((option) => {
                const isSelected = option.value === selectedValue;

                return (
                  <Pressable
                    key={`${option.label}:${option.value}`}
                    style={[
                      styles.featuredButton,
                      {
                        backgroundColor: isSelected ? theme.colors.TERTIARY_BG : theme.colors.CARD_BG,
                        borderColor: isSelected ? theme.colors.ACCENT_PRIMARY : theme.colors.BORDER_SECONDARY,
                      },
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    {option.icon ? <Feather name={option.icon} size={13} color={theme.colors.ACCENT_PRIMARY} /> : null}
                    <Text allowFontScaling={false} style={[styles.featuredText, { color: theme.colors.TEXT_PRIMARY }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.options} keyboardShouldPersistTaps="always">
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: isSelected ? theme.colors.TERTIARY_BG : theme.colors.CARD_BG,
                      borderColor: isSelected ? theme.colors.ACCENT_PRIMARY : theme.colors.BORDER_SECONDARY,
                    },
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text allowFontScaling={false} style={[styles.optionText, { color: theme.colors.TEXT_PRIMARY }]}>{option.label}</Text>
                  {isSelected ? <Feather name="check" size={16} color={theme.colors.ACCENT_PRIMARY} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxHeight: '72%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featuredButton: {
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '800',
  },
  options: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    minWidth: 54,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
