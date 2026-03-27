export type QuranFontId = 'amiri' | 'notoNaskh' | 'scheherazade';

export type QuranFontOption = {
  id: QuranFontId;
  label: string;
  fontFamily: string;
  note: string;
};

export const QURAN_FONT_PREVIEW_TEXT = 'الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ';

export const QURAN_FONT_OPTIONS: QuranFontOption[] = [
  {
    id: 'scheherazade',
    label: 'Scheherazade',
    fontFamily: 'ScheherazadeNew_400Regular',
    note: 'Mushaf hissi daha güçlü',
  },
  {
    id: 'amiri',
    label: 'Amiri',
    fontFamily: 'Amiri_400Regular',
    note: 'Klasik, dengeli',
  },
  {
    id: 'notoNaskh',
    label: 'Noto Naskh',
    fontFamily: 'NotoNaskhArabic_400Regular',
    note: 'Temiz, ince',
  },
];
