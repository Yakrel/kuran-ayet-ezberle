export type QuranFontId =
  | 'scheherazade'
  | 'uthmanicHafs'
  | 'amiri'
  | 'amiriQuran'
  | 'notoNaskh'
  | 'lateef'
  | 'notoSans';

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

export const DEFAULT_QURAN_FONT_ID: QuranFontId = 'scheherazade';
export const UTHMANIC_HAFS_FONT_FAMILY = 'UthmanicHafs';
export const QURAN_FONT_PREVIEW_TEXT = 'لَا أُقْسِمُ بِيَوْمِ الْقِيَامَةِ';

export const QURAN_FONT_OPTIONS: QuranFontOption[] = [
  {
    id: 'scheherazade',
    label: 'Scheherazade New',
    fontFamily: 'ScheherazadeNew_400Regular',
    verseTextStyle: {
      fontSize: 25,
      lineHeight: 46,
    },
    previewTextStyle: {
      fontSize: 27,
      lineHeight: 48,
    },
  },
  {
    id: 'uthmanicHafs',
    label: 'Uthmanic Hafs',
    fontFamily: UTHMANIC_HAFS_FONT_FAMILY,
    verseTextStyle: {
      fontSize: 26,
      lineHeight: 52,
    },
    previewTextStyle: {
      fontSize: 28,
      lineHeight: 54,
    },
  },
  {
    id: 'amiri',
    label: 'Amiri',
    fontFamily: 'Amiri_400Regular',
    verseTextStyle: {
      fontSize: 24,
      lineHeight: 46,
    },
    previewTextStyle: {
      fontSize: 26,
      lineHeight: 48,
    },
  },
  {
    id: 'amiriQuran',
    label: 'Amiri Quran',
    fontFamily: 'AmiriQuran_400Regular',
    verseTextStyle: {
      fontSize: 24,
      lineHeight: 48,
    },
    previewTextStyle: {
      fontSize: 26,
      lineHeight: 50,
    },
  },
  {
    id: 'notoNaskh',
    label: 'Noto Naskh Arabic',
    fontFamily: 'NotoNaskhArabic_400Regular',
    verseTextStyle: {
      fontSize: 24,
      lineHeight: 44,
    },
    previewTextStyle: {
      fontSize: 26,
      lineHeight: 46,
    },
  },
  {
    id: 'lateef',
    label: 'Lateef',
    fontFamily: 'Lateef_400Regular',
    verseTextStyle: {
      fontSize: 28,
      lineHeight: 48,
    },
    previewTextStyle: {
      fontSize: 30,
      lineHeight: 50,
    },
  },
  {
    id: 'notoSans',
    label: 'Noto Sans Arabic',
    fontFamily: 'NotoSansArabic_400Regular',
    verseTextStyle: {
      fontSize: 24,
      lineHeight: 44,
    },
    previewTextStyle: {
      fontSize: 26,
      lineHeight: 46,
    },
  },
];
