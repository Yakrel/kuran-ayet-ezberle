import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import {
  formatPlaybackRate,
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  normalizePlaybackRateInput,
  parsePlaybackRate,
  PLAYBACK_RATE_PRESETS,
} from '../utils/playbackRate';

type PlaybackSpeedModalProps = {
  visible: boolean;
  currentRate: number;
  title: string;
  invalidText: string;
  cancelLabel: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (rate: number) => void;
};

export function PlaybackSpeedModal({
  visible,
  currentRate,
  title,
  invalidText,
  cancelLabel,
  submitLabel,
  onClose,
  onSubmit,
}: PlaybackSpeedModalProps) {
  const { theme, themeType } = useTheme();
  const [value, setValue] = useState(formatPlaybackRate(currentRate).replace('x', ''));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(formatPlaybackRate(currentRate).replace('x', ''));
      setError(null);
    }
  }, [currentRate, visible]);

  const handleClose = () => {
    setValue(formatPlaybackRate(currentRate).replace('x', ''));
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    const nextRate = parsePlaybackRate(value);
    if (nextRate === null) {
      setError(invalidText);
      return;
    }

    onSubmit(nextRate);
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

          <View style={styles.presetRow}>
            {PLAYBACK_RATE_PRESETS.map((rate) => {
              const isSelected = parsePlaybackRate(value) === rate;
              return (
                <Pressable
                  key={rate}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor: isSelected ? theme.colors.TERTIARY_BG : theme.colors.CARD_BG,
                      borderColor: isSelected ? theme.colors.ACCENT_PRIMARY : theme.colors.BORDER_SECONDARY,
                    },
                  ]}
                  onPress={() => {
                    setValue(formatPlaybackRate(rate).replace('x', ''));
                    setError(null);
                  }}
                >
                  <Text style={[styles.presetText, { color: theme.colors.TEXT_PRIMARY }]}>{formatPlaybackRate(rate)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={value}
              onChangeText={(nextValue) => {
                setValue(normalizePlaybackRateInput(nextValue));
                setError(null);
              }}
              onSubmitEditing={handleSubmit}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              style={[
                styles.input,
                { color: theme.colors.TEXT_PRIMARY, backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY },
                error && { borderColor: theme.colors.ERROR },
              ]}
              placeholder={`${MIN_PLAYBACK_RATE}-${MAX_PLAYBACK_RATE}`}
              placeholderTextColor={theme.colors.TEXT_PLACEHOLDER}
            />
            <Text style={[styles.unit, { color: theme.colors.TEXT_MUTED }]}>x</Text>
          </View>

          {error ? <Text style={[styles.errorText, { color: theme.colors.ERROR }]}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.cancelButton, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.TEXT_SECONDARY }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
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
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '800',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  unit: {
    width: 20,
    fontSize: 22,
    fontWeight: '800',
  },
  errorText: {
    marginTop: -8,
    fontSize: 12,
    fontWeight: '700',
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
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
