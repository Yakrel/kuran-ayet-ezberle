import React from 'react';
import { Platform, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import type { TranslationOption, LanguageCode } from '../types/quran';
import type { QuranFontId, QuranFontOption } from '../constants/quranFonts';
import { theme } from '../styles/theme';

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
  quranFontText: string;
  fontPreviewText: string;
  quranFontPreview: string;
  quranFontFamily: string;
  languageText: string;
  translationText: string;
  autoScrollText: string;
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
  quranFontText,
  fontPreviewText,
  quranFontPreview,
  quranFontFamily,
  languageText,
  translationText,
  autoScrollText,
  aboutText,
  manageDownloadsText,
  onText,
  offText,
  onAboutPress,
  onManageDownloadsPress,
}: SettingsPanelProps) {
  return (
    <View style={styles.settingsPanel}>
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsLabel}>{languageText}</Text>
        <View style={styles.settingsPickerWrapper}>
          <Picker
            selectedValue={language}
            onValueChange={(nextLanguage) => onLanguageChange(nextLanguage as LanguageCode)}
            mode="dropdown"
            dropdownIconColor={theme.colors.PICKER_ICON}
            style={styles.settingsPicker}
          >
            <Picker.Item label="Türkçe" value="tr" color={theme.colors.TEXT_SECONDARY} />
            <Picker.Item label="English" value="en" color={theme.colors.TEXT_SECONDARY} />
          </Picker>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsLabel}>{translationText}</Text>
        <View style={styles.settingsPickerWrapper}>
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
        <Text style={styles.settingsLabel}>{quranFontText}</Text>
        <View style={styles.settingsPickerWrapper}>
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
                label={`${option.label} • ${option.note}`}
                value={option.id}
                color={theme.colors.TEXT_SECONDARY}
              />
            ))}
          </Picker>
        </View>
        <View style={styles.fontPreviewCard}>
          <Text style={styles.fontPreviewLabel}>{fontPreviewText}</Text>
          <Text style={[styles.fontPreviewArabic, { fontFamily: quranFontFamily }]}>
            {quranFontPreview}
          </Text>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsLabel}>{autoScrollText}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchValue}>{autoScrollEnabled ? onText : offText}</Text>
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
            pressed && styles.footerButtonPressed
          ]} 
          onPress={onManageDownloadsPress}
        >
          <Feather name="download-cloud" size={18} color={theme.colors.ACCENT_PRIMARY} />
          <Text style={styles.footerButtonText}>{manageDownloadsText}</Text>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [
            styles.footerButton,
            pressed && styles.footerButtonPressed
          ]} 
          onPress={onAboutPress}
        >
          <Feather name="info" size={18} color={theme.colors.ACCENT_PRIMARY} />
          <Text style={styles.footerButtonText}>{aboutText}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsPanel: {
    marginTop: theme.spacing.MD,
    padding: theme.spacing.MD,
    borderRadius: theme.borderRadius.MEDIUM,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    backgroundColor: theme.colors.TERTIARY_BG,
    gap: theme.spacing.MD,
  },
  settingsGroup: {
    gap: 5,
  },
  settingsLabel: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: theme.fontSize.XS,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsPickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    borderRadius: theme.borderRadius.MEDIUM,
    backgroundColor: theme.colors.CARD_BG,
    height: theme.sizes.INPUT_HEIGHT,
    justifyContent: 'center',
  },
  settingsPicker: {
    color: theme.colors.TEXT_SECONDARY,
    backgroundColor: 'transparent',
    fontSize: theme.fontSize.MD,
    ...Platform.select({
      android: {
        // Let the wrapper control the height on Android
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
    minHeight: theme.sizes.INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    borderRadius: theme.borderRadius.MEDIUM,
    backgroundColor: theme.colors.CARD_BG,
    paddingHorizontal: theme.spacing.MD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchValue: {
    color: theme.colors.TEXT_SECONDARY,
    fontSize: theme.fontSize.MD,
    fontWeight: '600',
  },
  fontPreviewCard: {
    marginTop: theme.spacing.SM,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    borderRadius: theme.borderRadius.MEDIUM,
    backgroundColor: theme.colors.CARD_BG,
    paddingHorizontal: theme.spacing.MD,
    paddingVertical: theme.spacing.SM,
    gap: theme.spacing.SM,
  },
  fontPreviewLabel: {
    color: theme.colors.TEXT_TERTIARY,
    fontSize: theme.fontSize.XS,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fontPreviewArabic: {
    color: theme.colors.TEXT_PRIMARY,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 24,
    lineHeight: 34,
  },
  footerButtons: {
    gap: 10,
    marginTop: theme.spacing.SM,
  },
  footerButton: {
    backgroundColor: theme.colors.CARD_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    borderRadius: theme.borderRadius.MEDIUM,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerButtonPressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.SECONDARY_BG,
  },
  footerButtonText: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: theme.fontSize.SM,
    fontWeight: '700',
  },
});