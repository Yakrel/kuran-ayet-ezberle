export type QuranFontId = 'amiri' | 'notoNaskh' | 'scheherazade' | 'lateef';

export type QuranFontOption = {
  id: QuranFontId;
  label: string;
  fontFamily: string;
  verseTextStyle: {
    fontSize: number;
    lineHeight: number;
  };
  previewTextStyle: {
    fontSize: number;
    lineHeight: number;
  };
};

export const QURAN_FONT_PREVIEW_TEXT = 'الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ';

export const QURAN_FONT_OPTIONS: QuranFontOption[] = [
  {
    id: 'scheherazade',
    label: 'Scheherazade',
    fontFamily: 'ScheherazadeNew_400Regular',
    verseTextStyle: {
      fontSize: 25,
      lineHeight: 42,
    },
    previewTextStyle: {
      fontSize: 27,
      lineHeight: 45,
    },
  },
  {
    id: 'amiri',
    label: 'Amiri',
    fontFamily: 'Amiri_400Regular',
    verseTextStyle: {
      fontSize: 24,
      lineHeight: 40,
    },
    previewTextStyle: {
      fontSize: 26,
      lineHeight: 43,
    },
  },
  {
    id: 'notoNaskh',
    label: 'Noto Naskh',
    fontFamily: 'NotoNaskhArabic_400Regular',
    verseTextStyle: {
      fontSize: 24,
      lineHeight: 40,
    },
    previewTextStyle: {
      fontSize: 26,
      lineHeight: 43,
    },
  },
  {
    id: 'lateef',
    label: 'Lateef',
    fontFamily: 'Lateef_400Regular',
    verseTextStyle: {
      fontSize: 26,
      lineHeight: 43,
    },
    previewTextStyle: {
      fontSize: 29,
      lineHeight: 47,
    },
  },
];
