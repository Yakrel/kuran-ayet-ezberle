import React from 'react';
import { Platform, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
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
  languageText: string;
  translationText: string;
  autoScrollText: string;
  themeText: string;
  playbackSpeedText: string;
  aboutText: string;
  manageDownloadsText: string;
  onText: string;
  offText: string;
  onAboutPress: () => void;
  onManageDownloadsPress: () => void;
};

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
  languageText,
  translationText,
  autoScrollText,
  themeText,
  playbackSpeedText,
  aboutText,
  manageDownloadsText,
  onText,
  offText,
  onAboutPress,
  onManageDownloadsPress,
}: SettingsPanelProps) {
  const { theme, themeType, setTheme } = useTheme();

  const languageOptions: Array<{ value: LanguageCode; label: string }> = [
    { value: 'tr', label: language === 'tr' ? 'Türkçe' : 'Turkish' },
    { value: 'en', label: language === 'tr' ? 'İngilizce' : 'English' },
  ];

  const themeOptions: Array<{ value: ThemeType; label: string }> = [
    { value: 'DARK', label: language === 'tr' ? 'Koyu' : 'Dark' },
    { value: 'PAPER', label: language === 'tr' ? 'Kağıt' : 'Paper' },
  ];

  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1.0, label: '1.0x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
  ];

  return (
    <View style={styles.settingsPanel}>
      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{languageText}</Text>
        <View style={[styles.settingsPickerWrapper, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Picker
            selectedValue={language}
            onValueChange={(nextLanguage) => onLanguageChange(nextLanguage as LanguageCode)}
            mode="dropdown"
            dropdownIconColor={theme.colors.PICKER_ICON}
            style={styles.settingsPicker}
          >
            {languageOptions.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
                color={theme.colors.TEXT_SECONDARY}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{themeText}</Text>
        <View style={[styles.settingsPickerWrapper, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Picker
            selectedValue={themeType}
            onValueChange={(nextTheme) => setTheme(nextTheme as ThemeType)}
            mode="dropdown"
            dropdownIconColor={theme.colors.PICKER_ICON}
            style={styles.settingsPicker}
          >
            {themeOptions.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
                color={theme.colors.TEXT_SECONDARY}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{playbackSpeedText}</Text>
        <View style={[styles.settingsPickerWrapper, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Picker
            selectedValue={playbackRate}
            onValueChange={(nextRate) => onPlaybackRateChange(Number(nextRate))}
            mode="dropdown"
            dropdownIconColor={theme.colors.PICKER_ICON}
            style={styles.settingsPicker}
          >
            {speedOptions.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
                color={theme.colors.TEXT_SECONDARY}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{translationText}</Text>
        <View style={[styles.settingsPickerWrapper, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Picker
            selectedValue={selectedTranslationAuthorId}
            onValueChange={(nextAuthorId) => onTranslationChange(Number(nextAuthorId))}
            mode="dropdown"
            dropdownIconColor={theme.colors.PICKER_ICON}
            style={styles.settingsPicker}
          >
            {translationOptionsForLanguage.map((option) => (
              <Picker.Item
                key={option.id}
                label={option.label}
                value={option.id}
                color={theme.colors.TEXT_SECONDARY}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={[styles.settingsLabel, { color: theme.colors.TEXT_TERTIARY }]}>{quranFontText}</Text>
        <View style={[styles.settingsPickerWrapper, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Picker
            selectedValue={quranFontId}
            onValueChange={(nextFontId) => onQuranFontChange(nextFontId as QuranFontId)}
            mode="dropdown"
            dropdownIconColor={theme.colors.PICKER_ICON}
            style={styles.settingsPicker}
          >
            {quranFontOptions.map((option) => (
              <Picker.Item
                key={option.id}
                label={`${option.label} • ${option.note[language]}`}
                value={option.id}
                color={theme.colors.TEXT_SECONDARY}
              />
            ))}
          </Picker>
        </View>
        <View style={[styles.fontPreviewCard, { borderColor: theme.colors.BORDER_SECONDARY, backgroundColor: theme.colors.CARD_BG }]}>
          <Text style={[styles.fontPreviewLabel, { color: theme.colors.TEXT_TERTIARY }]}>{fontPreviewText}</Text>
          <Text style={[styles.fontPreviewArabic, { fontFamily: quranFontFamily, color: theme.colors.TEXT_PRIMARY }]}>
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
    fontSize: 24,
    lineHeight: 40,
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
});

