import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TranslationStrings } from '../i18n/types';
import { useTheme } from '../hooks/useTheme';
import { theme as staticTheme } from '../styles/theme';

type AboutSheetProps = {
  visible: boolean;
  onClose: () => void;
  appVersion: string;
  developerName: string;
  text: TranslationStrings;
};

export function AboutSheet({
  visible,
  onClose,
  appVersion,
  developerName,
  text,
}: AboutSheetProps) {
  const { theme, themeType } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.about}</Text>
          <Text style={[styles.aboutText, { color: theme.colors.TEXT_SECONDARY }]}>{`${text.appName}\n${text.version}: ${appVersion}\n${text.developedBy}: ${developerName}`}</Text>
          <Text style={[styles.aboutText, { color: theme.colors.TEXT_SECONDARY }]}>{text.aboutDescription}</Text>
          <Pressable style={[styles.closeButton, { backgroundColor: theme.colors.ACCENT_PRIMARY }]} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>{text.close}</Text>
          </Pressable>
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
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    borderRadius: staticTheme.borderRadius.XXLARGE,
    borderWidth: 1,
    padding: staticTheme.spacing.LG,
    gap: staticTheme.spacing.MD,
  },
  modalTitle: {
    fontSize: staticTheme.fontSize.LG,
    fontWeight: '800',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
  closeButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
