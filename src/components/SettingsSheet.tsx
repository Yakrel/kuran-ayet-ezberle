import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemeType } from '../constants/colors';
import type { LanguageCode, TranslationStrings } from '../i18n/types';
import type { TranslationOption } from '../types/quran';
import type { QuranFontId, QuranFontOption } from '../constants/quranFonts';
import { useTheme } from '../hooks/useTheme';
import { theme as staticTheme } from '../styles/theme';
import { SettingsPanel } from './SettingsPanel';

type SettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
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
  onThemeChange: (theme: ThemeType) => void;
  onAboutPress: () => void;
  onManageDownloadsPress: () => void;
  text: TranslationStrings;
};

export function SettingsSheet({
  visible,
  onClose,
  text,
  ...panelProps
}: SettingsSheetProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.settings}</Text>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]}>
              <Feather name="x" size={24} color={theme.colors.TEXT_PRIMARY} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <SettingsPanel
              {...panelProps}
              languageText={text.language}
              languageTurkishText={text.languageTurkish}
              languageEnglishText={text.languageEnglish}
              translationText={text.translation}
              quranFontText={text.quranFont}
              autoScrollText={text.autoScroll}
              showTranscriptionText={text.showTranscription}
              themeText={text.theme}
              themeDarkText={text.themeDark}
              themePaperText={text.themePaper}
              aboutText={text.about}
              manageDownloadsText={text.manageDownloads}
              onText={text.on}
              offText={text.off}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: staticTheme.borderRadius.XXLARGE,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    paddingHorizontal: staticTheme.spacing.LG,
    paddingTop: staticTheme.spacing.LG,
    paddingBottom: staticTheme.spacing.MD,
    gap: staticTheme.spacing.MD,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: staticTheme.fontSize.LG,
    fontWeight: '800',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingBottom: staticTheme.spacing.LG,
  },
});
