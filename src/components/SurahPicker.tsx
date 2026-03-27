import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { SurahSummary } from '../types/quran';
import { theme } from '../styles/theme';

type SurahPickerProps = {
  surahs: SurahSummary[];
  selectedSurahId: number | null;
  isFetchingSurahs: boolean;
  onSurahChange: (surahId: number | string) => void;
};

export function SurahPicker({
  surahs,
  selectedSurahId,
  isFetchingSurahs,
  onSurahChange,
}: SurahPickerProps) {
  if (isFetchingSurahs) {
    return (
      <View style={styles.pickerCompact}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.pickerCompact}>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedSurahId ?? undefined}
          onValueChange={onSurahChange}
          mode="dropdown"
          dropdownIconColor={theme.colors.PICKER_ICON}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {surahs.map((surah) => (
            <Picker.Item
              key={surah.id}
              value={surah.id}
              label={`${surah.id}. ${surah.name} (${surah.verse_count})`}
              color={theme.colors.TEXT_SECONDARY}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerCompact: {
    flex: 1,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
    borderRadius: theme.borderRadius.MEDIUM,
    backgroundColor: theme.colors.TERTIARY_BG,
    height: theme.sizes.INPUT_HEIGHT,
    justifyContent: 'center',
  },
  picker: {
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
  pickerItem: {
    color: theme.colors.TEXT_SECONDARY,
    fontSize: theme.fontSize.MD,
  },
});
