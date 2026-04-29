import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import type { TranslationOption } from '../types/quran';
import type { LanguageCode } from '../i18n/types';
import { useTheme } from '../hooks/useTheme';
import { ThemeType } from '../constants/colors';
import type { QuranFontId, QuranFontOption } from '../constants/quranFonts';
import { QURAN_FONT_PREVIEW_TEXT } from '../constants/quranFonts';

type SettingsPanelProps = {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  selectedTranslationAuthorId: number;
  translationOptionsForLanguage: TranslationOption[];
  onTranslationChange: (authorId: number) => void;
  quranFontId: QuranFontId;
  quranFontOptions: QuranFontOption[];
  onQuranFontChange: (fontId: QuranFontId) => void;
  autoScrollEnabled: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  showTranscription: boolean;
  onShowTranscriptionChange: (enabled: boolean) => void;
  languageText: string;
  languageTurkishText: string;
  languageEnglishText: string;
  translationText: string;
  quranFontText: string;
  autoScrollText: string;
  showTranscriptionText: string;
  themeText: string;
  themeDarkText: string;
  themePaperText: string;
  onThemeChange: (theme: ThemeType) => void;
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

type ActiveSelectKey = 'language' | 'theme' | 'translation' | 'quranFont' | null;

export function SettingsPanel({
  language,
  onLanguageChange,
  selectedTranslationAuthorId,
  translationOptionsForLanguage,
  onTranslationChange,
  quranFontId,
  quranFontOptions,
  onQuranFontChange,
  autoScrollEnabled,
  onAutoScrollChange,
  showTranscription,
  onShowTranscriptionChange,
  languageText,
  languageTurkishText,
  languageEnglishText,
  translationText,
  quranFontText,
  autoScrollText,
  showTranscriptionText,
  themeText,
  themeDarkText,
  themePaperText,
  onThemeChange,
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

  const selectedQuranFont = quranFontOptions.find((option) => option.id === quranFontId);
  if (!selectedQuranFont) {
    throw new Error(`Selected Quran font is not configured: ${quranFontId}.`);
  }

  const activeSelectTitle = activeSelect === 'language'
    ? languageText
    : activeSelect === 'theme'
    ? themeText
    : activeSelect === 'translation'
    ? translationText
    : activeSelect === 'quranFont'
    ? quranFontText
    : '';

  const activeSelectOptions = activeSelect === 'language'
    ? languageOptions
    : activeSelect === 'theme'
    ? themeOptions
    : activeSelect === 'translation'
    ? translationPickerOptions
    : activeSelect === 'quranFont'
    ? quranFontPickerOptions
    : [];

  const activeSelectValue = activeSelect === 'language'
    ? language
    : activeSelect === 'theme'
    ? themeType
    : activeSelect === 'translation'
    ? selectedTranslationAuthorId
    : activeSelect === 'quranFont'
    ? quranFontId
    : null;

  function closeSelect() {
    setActiveSelect(null);
  }

  function renderQuranFontField(font: QuranFontOption) {
    return (
      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{quranFontText}</Text>
        <Pressable
          onPress={() => setActiveSelect('quranFont')}
          style={({ pressed }) => [
            styles.themedSelectButton,
            { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG },
            pressed && { opacity: 0.8 }
          ]}
        >
          <Text style={[styles.themedSelectValue, { color: theme.colors.TEXT_PRIMARY }]} numberOfLines={1}>
            {font.label}
          </Text>
          <Feather name="chevron-down" size={18} color={theme.colors.PICKER_ICON} />
        </Pressable>
        <Text
          style={[
            styles.fontPreviewText,
            font.previewTextStyle,
            { color: theme.colors.TEXT_SECONDARY, fontFamily: font.fontFamily },
          ]}
        >
          {QURAN_FONT_PREVIEW_TEXT}
        </Text>
      </View>
    );
  }

  function renderSelectField<T extends string | number>(
    key: Exclude<ActiveSelectKey, null>,
    label: string,
    value: T,
    options: Array<SelectOption<T>>,
    onChange: (nextValue: T) => void
  ) {
    const selectedOption = options.find((option) => option.value === value);
    if (!selectedOption) {
      throw new Error(`Selected ${key} value is not configured: ${String(value)}.`);
    }
    const selectedLabel = selectedOption.label;

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
      <View style={styles.compactGrid}>
        {renderSelectField('language', languageText, language, languageOptions, onLanguageChange)}
        {renderSelectField('theme', themeText, themeType, themeOptions, (nextTheme) => onThemeChange(nextTheme as ThemeType))}
      </View>

      {renderSelectField('translation', translationText, selectedTranslationAuthorId, translationPickerOptions, (nextAuthorId) => onTranslationChange(Number(nextAuthorId)))}

      <View style={styles.compactGrid}>
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

        <View style={styles.settingsGroup}>
          <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{showTranscriptionText}</Text>
          <View style={[styles.switchRow, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
            <Text style={[styles.switchValue, { color: theme.colors.TEXT_SECONDARY }]}>{showTranscription ? onText : offText}</Text>
            <Switch
              value={showTranscription}
              onValueChange={onShowTranscriptionChange}
              trackColor={{
                false: theme.colors.BORDER_SECONDARY,
                true: theme.colors.ACCENT_PRIMARY,
              }}
              thumbColor={theme.colors.TEXT_PRIMARY}
            />
          </View>
        </View>
      </View>

      {renderQuranFontField(selectedQuranFont)}

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
                const optionFont =
                  activeSelect === 'quranFont'
                    ? quranFontOptions.find((font) => font.id === option.value)
                    : undefined;

                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => {
                      if (activeSelect === 'language') {
                        onLanguageChange(option.value as LanguageCode);
                      } else if (activeSelect === 'theme') {
                        onThemeChange(option.value as ThemeType);
                      } else if (activeSelect === 'translation') {
                        onTranslationChange(Number(option.value));
                      } else if (activeSelect === 'quranFont') {
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
                    <View style={styles.selectOptionCopy}>
                      <Text style={[styles.selectOptionText, { color: theme.colors.TEXT_PRIMARY }]}>{option.label}</Text>
                      {activeSelect === 'quranFont' ? (
                        <Text
                          style={[
                            styles.selectOptionPreview,
                            optionFont?.previewTextStyle,
                            {
                              color: theme.colors.TEXT_SECONDARY,
                              fontFamily: optionFont?.fontFamily,
                            },
                          ]}
                        >
                          {QURAN_FONT_PREVIEW_TEXT}
                        </Text>
                      ) : null}
                    </View>
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
    gap: 14,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  settingsGroup: {
    flex: 1,
    minWidth: 150,
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
    minHeight: 46,
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
    minHeight: 46,
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
  fontPreviewText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingHorizontal: 2,
  },
  switchRow: {
    minHeight: 46,
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
  footerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  footerButton: {
    flex: 1,
    minWidth: 150,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectOptionCopy: {
    flex: 1,
    gap: 4,
  },
  selectOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectOptionPreview: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
