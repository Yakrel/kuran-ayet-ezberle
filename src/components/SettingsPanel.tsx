import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import type { TranslationOption, LanguageCode } from '../types/quran';
import type { QuranFontId, QuranFontOption } from '../constants/quranFonts';
import { useTheme } from '../hooks/useTheme';
import { ThemeType } from '../constants/colors';

type SettingsPanelProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  selectedTranslationAuthorId: number;
  translationOptionsForLanguage: TranslationOption[];
  onTranslationChange: (authorId: number) => void;
  autoScrollEnabled: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  quranFontId: QuranFontId;
  quranFontOptions: QuranFontOption[];
  onQuranFontChange: (fontId: QuranFontId) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  quranFontText: string;
  fontPreviewText: string;
  quranFontPreview: string;
  quranFontFamily: string;
  quranFontPreviewStyle: {
    fontSize: number;
    lineHeight: number;
  };
  languageText: string;
  languageTurkishText: string;
  languageEnglishText: string;
  translationText: string;
  autoScrollText: string;
  themeText: string;
  themeDarkText: string;
  themePaperText: string;
  onThemeChange: (theme: ThemeType) => void;
  playbackSpeedText: string;
  aboutText: string;
  manageDownloadsText: string;
  onText: string;
  offText: string;
  onAboutPress: () => void;
  onManageDownloadsPress: () => void;
};

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type ActiveSelectKey = 'language' | 'theme' | 'speed' | 'translation' | 'font' | null;

export function SettingsPanel({
  language,
  onLanguageChange,
  selectedTranslationAuthorId,
  translationOptionsForLanguage,
  onTranslationChange,
  autoScrollEnabled,
  onAutoScrollChange,
  quranFontId,
  quranFontOptions,
  onQuranFontChange,
  playbackRate,
  onPlaybackRateChange,
  quranFontText,
  fontPreviewText,
  quranFontPreview,
  quranFontFamily,
  quranFontPreviewStyle,
  languageText,
  languageTurkishText,
  languageEnglishText,
  translationText,
  autoScrollText,
  themeText,
  themeDarkText,
  themePaperText,
  onThemeChange,
  playbackSpeedText,
  aboutText,
  manageDownloadsText,
  onText,
  offText,
  onAboutPress,
  onManageDownloadsPress,
}: SettingsPanelProps) {
  const { theme, themeType } = useTheme();
  const pickerMode = Platform.OS === 'android' && themeType === 'PAPER' ? 'dialog' : 'dropdown';
  const useThemedSelect = Platform.OS === 'android' && themeType === 'PAPER';
  const [activeSelect, setActiveSelect] = useState<ActiveSelectKey>(null);

  const languageOptions: Array<SelectOption<LanguageCode>> = [
    { value: 'tr', label: languageTurkishText },
    { value: 'en', label: languageEnglishText },
  ];

  const themeOptions: Array<SelectOption<ThemeType>> = [
    { value: 'DARK', label: themeDarkText },
    { value: 'PAPER', label: themePaperText },
  ];

  const speedOptions: Array<SelectOption<number>> = [
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1.0, label: '1.0x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
  ];

  const translationPickerOptions = useMemo<Array<SelectOption<number>>>(
    () =>
      translationOptionsForLanguage.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [translationOptionsForLanguage]
  );

  const quranFontPickerOptions = useMemo<Array<SelectOption<QuranFontId>>>(
    () =>
      quranFontOptions.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [quranFontOptions]
  );

  const activeSelectTitle = activeSelect === 'language'
    ? languageText
    : activeSelect === 'theme'
    ? themeText
    : activeSelect === 'speed'
    ? playbackSpeedText
    : activeSelect === 'translation'
    ? translationText
    : activeSelect === 'font'
    ? quranFontText
    : '';

  const activeSelectOptions = activeSelect === 'language'
    ? languageOptions
    : activeSelect === 'theme'
    ? themeOptions
    : activeSelect === 'speed'
    ? speedOptions
    : activeSelect === 'translation'
    ? translationPickerOptions
    : activeSelect === 'font'
    ? quranFontPickerOptions
    : [];

  const activeSelectValue = activeSelect === 'language'
    ? language
    : activeSelect === 'theme'
    ? themeType
    : activeSelect === 'speed'
    ? playbackRate
    : activeSelect === 'translation'
    ? selectedTranslationAuthorId
    : activeSelect === 'font'
    ? quranFontId
    : null;

  function closeSelect() {
    setActiveSelect(null);
  }

  function renderSelectField<T extends string | number>(
    key: Exclude<ActiveSelectKey, null>,
    label: string,
    value: T,
    options: Array<SelectOption<T>>,
    onChange: (nextValue: T) => void
  ) {
    const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value);

    if (useThemedSelect) {
      return (
        <View style={styles.settingsGroup}>
          <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{label}</Text>
          <Pressable
            onPress={() => setActiveSelect(key)}
            style={({ pressed }) => [
              styles.themedSelectButton,
              { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Text style={[styles.themedSelectValue, { color: theme.colors.TEXT_PRIMARY }]} numberOfLines={1}>
              {selectedLabel}
            </Text>
            <Feather name="chevron-down" size={18} color={theme.colors.PICKER_ICON} />
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{label}</Text>
        <View style={[styles.settingsPickerWrapper, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Picker
            selectedValue={value}
            onValueChange={(nextValue) => onChange(nextValue as T)}
            mode={pickerMode}
            dropdownIconColor={theme.colors.PICKER_ICON}
            style={[styles.settingsPicker, { color: theme.colors.TEXT_PRIMARY }]}
          >
            {options.map((option) => (
              <Picker.Item
                key={String(option.value)}
                label={option.label}
                value={option.value}
                color={theme.colors.TEXT_SECONDARY}
              />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.settingsPanel}>
      {renderSelectField('language', languageText, language, languageOptions, onLanguageChange)}
      {renderSelectField('theme', themeText, themeType, themeOptions, (nextTheme) => onThemeChange(nextTheme as ThemeType))}
      {renderSelectField('speed', playbackSpeedText, playbackRate, speedOptions, (nextRate) => onPlaybackRateChange(Number(nextRate)))}
      {renderSelectField('translation', translationText, selectedTranslationAuthorId, translationPickerOptions, (nextAuthorId) => onTranslationChange(Number(nextAuthorId)))}

      <View style={styles.settingsGroup}>
        {renderSelectField('font', quranFontText, quranFontId, quranFontPickerOptions, onQuranFontChange)}
        <View style={[styles.fontPreviewCard, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Text style={[styles.fontPreviewLabel, { color: theme.colors.TEXT_TERTIARY }]}>{fontPreviewText}</Text>
          <Text
            style={[
              styles.fontPreviewArabic,
              quranFontPreviewStyle,
              { fontFamily: quranFontFamily, color: theme.colors.TEXT_PRIMARY }
            ]}
          >
            {quranFontPreview}
          </Text>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{autoScrollText}</Text>
        <View style={[styles.switchRow, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Text style={[styles.switchValue, { color: theme.colors.TEXT_SECONDARY }]}>{autoScrollEnabled ? onText : offText}</Text>
          <Switch
            value={autoScrollEnabled}
            onValueChange={onAutoScrollChange}
            trackColor={{
              false: theme.colors.BORDER_SECONDARY,
              true: theme.colors.ACCENT_PRIMARY,
            }}
            thumbColor={theme.colors.TEXT_PRIMARY}
          />
        </View>
      </View>

      <View style={styles.footerButtons}>
        <Pressable 
          style={({ pressed }) => [
            styles.footerButton,
            { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG },
            pressed && { opacity: 0.7, backgroundColor: theme.colors.SECONDARY_BG }
          ]} 
          onPress={onManageDownloadsPress}
        >
          <Feather name="download-cloud" size={18} color={theme.colors.ACCENT_PRIMARY} />
          <Text style={[styles.footerButtonText, { color: theme.colors.TEXT_PRIMARY }]}>{manageDownloadsText}</Text>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [
            styles.footerButton,
            { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG },
            pressed && { opacity: 0.7, backgroundColor: theme.colors.SECONDARY_BG }
          ]} 
          onPress={onAboutPress}
        >
          <Feather name="info" size={18} color={theme.colors.ACCENT_PRIMARY} />
          <Text style={[styles.footerButtonText, { color: theme.colors.TEXT_PRIMARY }]}>{aboutText}</Text>
        </Pressable>
      </View>

      <Modal visible={activeSelect !== null} transparent animationType="fade" onRequestClose={closeSelect}>
        <Pressable style={styles.selectModalOverlay} onPress={closeSelect}>
          <Pressable
            onPress={() => undefined}
            style={[
              styles.selectModalCard,
              { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }
            ]}
          >
            <View style={[styles.selectModalHeader, { borderBottomColor: theme.colors.BORDER_PRIMARY }]}>
              <Text style={[styles.selectModalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{activeSelectTitle}</Text>
              <Pressable onPress={closeSelect} style={[styles.selectModalClose, { backgroundColor: theme.colors.CARD_BG }]}>
                <Feather name="x" size={18} color={theme.colors.TEXT_PRIMARY} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.selectOptions}>
              {activeSelectOptions.map((option) => {
                const isSelected = activeSelectValue === option.value;

                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => {
                      if (activeSelect === 'language') {
                        onLanguageChange(option.value as LanguageCode);
                      } else if (activeSelect === 'theme') {
                        onThemeChange(option.value as ThemeType);
                      } else if (activeSelect === 'speed') {
                        onPlaybackRateChange(Number(option.value));
                      } else if (activeSelect === 'translation') {
                        onTranslationChange(Number(option.value));
                      } else if (activeSelect === 'font') {
                        onQuranFontChange(option.value as QuranFontId);
                      }
                      closeSelect();
                    }}
                    style={[
                      styles.selectOptionButton,
                      {
                        backgroundColor: isSelected ? theme.colors.TERTIARY_BG : theme.colors.CARD_BG,
                        borderColor: isSelected ? theme.colors.ACCENT_PRIMARY : theme.colors.BORDER_SECONDARY,
                      }
                    ]}
                  >
                    <Text style={[styles.selectOptionText, { color: theme.colors.TEXT_PRIMARY }]}>{option.label}</Text>
                    {isSelected ? <Feather name="check" size={16} color={theme.colors.ACCENT_PRIMARY} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsPanel: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  settingsGroup: {
    gap: 5,
  },
  settingsLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsPickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  settingsPicker: {
    backgroundColor: 'transparent',
    fontSize: 16,
    ...Platform.select({
      android: {
        marginLeft: 4,
      },
      web: {
        height: '100%',
        borderWidth: 0,
        paddingLeft: 8,
      }
    }),
  },
  themedSelectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  themedSelectValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  switchRow: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  fontPreviewCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  fontPreviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fontPreviewArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  footerButtons: {
    gap: 10,
    marginTop: 8,
  },
  footerButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    justifyContent: 'center',
    padding: 20,
  },
  selectModalCard: {
    maxHeight: '72%',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  selectModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  selectModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOptions: {
    padding: 14,
    gap: 10,
  },
  selectOptionButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectOptionText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
