import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemeType } from '../constants/colors';
import type { LanguageCode, TranslationStrings } from '../i18n/types';
import type { TranslationOption } from '../types/quran';
import type { QuranFontId, QuranFontOption } from '../constants/quranFonts';
import type { ReciterId, ReciterOption } from '../constants/reciters';
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
  selectedReciterId: ReciterId;
  reciterOptions: ReciterOption[];
  onReciterChange: (reciterId: ReciterId) => void;
  autoScrollEnabled: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  ayahTrackingEnabled: boolean;
  ayahTrackingAvailable: boolean;
  onAyahTrackingChange: (enabled: boolean) => void;
  onThemeChange: (theme: ThemeType) => void;
  quranFontId: QuranFontId;
  quranFontOptions: QuranFontOption[];
  onQuranFontChange: (fontId: QuranFontId) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  quranFontPreview: string;
  quranFontFamily: string;
  quranFontPreviewStyle: {
    fontSize: number;
    lineHeight: number;
  };
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
              quranFontText={text.quranFont}
              fontPreviewText={text.fontPreview}
              languageText={text.language}
              translationText={text.translation}
              reciterText={text.reciter}
              trackedReciterText={text.trackedReciter}
              autoScrollText={text.autoScroll}
              ayahTrackingText={text.ayahTracking}
              themeText={text.theme}
              playbackSpeedText={text.playbackSpeed}
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
    justifyContent: 'center',
    padding: staticTheme.spacing.XL,
  },
  modalContent: {
    maxHeight: '88%',
    borderRadius: staticTheme.borderRadius.XXLARGE,
    borderWidth: 1,
    padding: staticTheme.spacing.LG,
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
    gap: staticTheme.spacing.MD,
  },
});
