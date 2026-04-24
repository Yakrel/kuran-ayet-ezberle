import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { onlyDigits } from '../utils/parsers';

type RangeInputModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  initialValue: string;
  onSubmit: (value: string) => void;
  maxValue?: number;
  maxActionLabel?: string;
  maxLabel: string;
  cancelLabel: string;
  submitLabel: string;
  placeholder?: string;
};

export function RangeInputModal({
  visible,
  onClose,
  title,
  initialValue,
  onSubmit,
  maxValue,
  maxActionLabel,
  maxLabel,
  cancelLabel,
  submitLabel,
  placeholder = '1',
}: RangeInputModalProps) {
  const [value, setValue] = useState(initialValue);
  const { theme, themeType } = useTheme();

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [initialValue, visible]);

  const handleSubmit = () => {
    onSubmit(value);
    onClose();
  };

  const handleClose = () => {
    setValue(initialValue);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.TEXT_PRIMARY }]}>{title}</Text>
            <Pressable onPress={handleClose} style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]}>
              <Feather name="x" size={20} color={theme.colors.TEXT_SECONDARY} />
            </Pressable>
          </View>

          {maxValue && (
            <View style={styles.hintRow}>
              <Text style={[styles.hint, { color: theme.colors.TEXT_MUTED }]}>
                {maxLabel}: {maxValue}
              </Text>
              {maxActionLabel ? (
                <Pressable
                  style={[styles.maxButton, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}
                  onPress={() => setValue(String(maxValue))}
                >
                  <Feather name="skip-forward" size={13} color={theme.colors.ACCENT_PRIMARY} />
                  <Text style={[styles.maxButtonText, { color: theme.colors.TEXT_PRIMARY }]}>{maxActionLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          <TextInput
            value={value}
            onChangeText={(text) => setValue(onlyDigits(text))}
            onSubmitEditing={handleSubmit}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            style={[styles.input, { color: theme.colors.TEXT_PRIMARY, backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
          />

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.cancelButton, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.TEXT_SECONDARY }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.submitButton, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
              onPress={handleSubmit}
            >
              <Text style={[styles.submitButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>{submitLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
  },
  hintRow: {
    minHeight: 30,
    marginTop: -8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  maxButton: {
    minHeight: 30,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {},
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
