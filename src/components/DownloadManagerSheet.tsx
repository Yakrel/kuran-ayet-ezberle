import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TranslationStrings } from '../i18n/types';
import { useTheme } from '../hooks/useTheme';
import { theme as staticTheme } from '../styles/theme';

type DownloadManagerSheetProps = {
  visible: boolean;
  onClose: () => void;
  selectedReciterLabel: string;
  cacheStats: {
    files: number;
    megabytes: number;
    readySurahs: number;
    totalSurahs: number;
    offlineReady: boolean;
  };
  isDownloadingAll: boolean;
  downloadProgressLabel: string;
  onDownloadAll: () => void;
  onClearDownloads: () => void;
  text: TranslationStrings;
};

export function DownloadManagerSheet({
  visible,
  onClose,
  selectedReciterLabel,
  cacheStats,
  isDownloadingAll,
  downloadProgressLabel,
  onDownloadAll,
  onClearDownloads,
  text,
}: DownloadManagerSheetProps) {
  const { theme, themeType } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.SECONDARY_BG, borderColor: theme.colors.BORDER_PRIMARY }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.TEXT_PRIMARY }]}>{text.manageDownloads}</Text>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.CARD_BG }]}>
              <Feather name="x" size={24} color={theme.colors.TEXT_PRIMARY} />
            </Pressable>
          </View>

          <View style={styles.downloadCard}>
            <Text style={[styles.downloadSubtitle, { color: theme.colors.TEXT_SECONDARY }]}>
              {text.selectedReciterDownloads(selectedReciterLabel)}
            </Text>
            <Text style={[styles.downloadHint, { color: theme.colors.TEXT_MUTED }]}>
              {text.selectedReciterOnlyHint(selectedReciterLabel)}
            </Text>
            <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.readySurahs}: ${cacheStats.readySurahs}/${cacheStats.totalSurahs}`}</Text>
            <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.downloadedSurahFiles}: ${cacheStats.files} MP3`}</Text>
            <Text style={[styles.downloadStat, { color: theme.colors.TEXT_PRIMARY }]}>{`${text.storageUsed}: ${cacheStats.megabytes} MB`}</Text>
            {downloadProgressLabel ? <Text style={[styles.downloadHint, { color: theme.colors.TEXT_MUTED }]}>{downloadProgressLabel}</Text> : null}

            <Pressable
              style={[styles.downloadButton, isDownloadingAll && styles.downloadButtonDisabled, { backgroundColor: theme.colors.ACCENT_PRIMARY }]}
              disabled={isDownloadingAll}
              onPress={onDownloadAll}
            >
              <Text style={[styles.downloadButtonText, { color: themeType === 'DARK' ? theme.colors.TEXT_PRIMARY : '#fff' }]}>
                {isDownloadingAll
                  ? text.downloadingSelectedReciter(selectedReciterLabel)
                  : cacheStats.offlineReady
                  ? text.downloadReadyForReciter(selectedReciterLabel)
                  : text.downloadSelectedReciter(selectedReciterLabel)}
              </Text>
            </Pressable>

            <Pressable style={[styles.clearButton, { backgroundColor: theme.colors.CARD_BG, borderColor: theme.colors.BORDER_SECONDARY }]} onPress={onClearDownloads}>
              <Text style={[styles.clearButtonText, { color: theme.colors.TEXT_SECONDARY }]}>{text.clearReciterDownloads(selectedReciterLabel)}</Text>
            </Pressable>
          </View>
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
  downloadCard: {
    gap: staticTheme.spacing.SM,
  },
  downloadSubtitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  downloadHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  downloadStat: {
    fontSize: 13,
    fontWeight: '600',
  },
  downloadButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  clearButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
