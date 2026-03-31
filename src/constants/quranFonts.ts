export type QuranFontId = 'amiri' | 'notoNaskh' | 'scheherazade';

export type QuranFontOption = {
  id: QuranFontId;
  label: string;
  fontFamily: string;
  note: {
    tr: string;
    en: string;
  };
};

export const QURAN_FONT_PREVIEW_TEXT = 'الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ';

export const QURAN_FONT_OPTIONS: QuranFontOption[] = [
  {
    id: 'scheherazade',
    label: 'Scheherazade',
    fontFamily: 'ScheherazadeNew_400Regular',
    note: {
      tr: 'Mushaf hissi daha güçlü',
      en: 'Closer to printed mushaf style',
    },
  },
  {
    id: 'amiri',
    label: 'Amiri',
    fontFamily: 'Amiri_400Regular',
    note: {
      tr: 'Klasik ve dengeli',
      en: 'Classic and balanced',
    },
  },
  {
    id: 'notoNaskh',
    label: 'Noto Naskh',
    fontFamily: 'NotoNaskhArabic_400Regular',
    note: {
      tr: 'Temiz ve ince',
      en: 'Clean and light',
    },
  },
];
