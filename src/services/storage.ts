import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeType } from '../constants/colors';
import type { LanguageCode } from '../i18n/types';

const KEYS = {
  LANGUAGE: '@app_language',
  QURAN_FONT: '@app_quran_font',
  PRACTICE_STATE: '@app_practice_state',
  SELECTED_SURAH: '@app_selected_surah',
  SELECTED_TRANSLATION: '@app_selected_translation',
  THEME: '@app_theme',
  AUTO_SCROLL: '@app_auto_scroll',
  SHOW_TRANSCRIPTION: '@app_show_transcription',
};

async function setBoolean(key: string, value: boolean) {
  await AsyncStorage.setItem(key, value ? '1' : '0');
}

async function getBoolean(key: string) {
  const value = await AsyncStorage.getItem(key);
  if (value === null) {
    return null;
  }
  if (value !== '0' && value !== '1') {
    throw new Error(`Invalid boolean storage value for ${key}.`);
  }

  return value === '1';
}

export const Storage = {
  async setLanguage(lang: string) {
    await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
  },
  async getLanguage() {
    const val = await AsyncStorage.getItem(KEYS.LANGUAGE);
    if (val === null) {
      return null;
    }
    if (val !== 'tr' && val !== 'en') {
      throw new Error(`Invalid persisted language: ${val}.`);
    }
    return val as LanguageCode;
  },

  async setQuranFont(fontId: string) {
    await AsyncStorage.setItem(KEYS.QURAN_FONT, fontId);
  },
  async getQuranFont() {
    return await AsyncStorage.getItem(KEYS.QURAN_FONT);
  },

  async setSelectedSurah(id: number) {
    await AsyncStorage.setItem(KEYS.SELECTED_SURAH, String(id));
  },
  async getSelectedSurah() {
    const val = await AsyncStorage.getItem(KEYS.SELECTED_SURAH);
    if (val === null) {
      return null;
    }

    const parsed = Number(val);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid persisted surah: ${val}.`);
    }
    return parsed;
  },

  async setPracticeState(value: unknown) {
    await AsyncStorage.setItem(KEYS.PRACTICE_STATE, JSON.stringify(value));
  },
  async getPracticeState() {
    const val = await AsyncStorage.getItem(KEYS.PRACTICE_STATE);
    if (!val) {
      return null;
    }

    return JSON.parse(val) as unknown;
  },

  async setSelectedTranslation(id: number) {
    await AsyncStorage.setItem(KEYS.SELECTED_TRANSLATION, String(id));
  },
  async getSelectedTranslation() {
    const val = await AsyncStorage.getItem(KEYS.SELECTED_TRANSLATION);
    if (val === null) {
      return null;
    }

    const parsed = Number(val);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid persisted translation: ${val}.`);
    }
    return parsed;
  },

  async setTheme(themeType: ThemeType) {
    await AsyncStorage.setItem(KEYS.THEME, themeType);
  },
  async getTheme() {
    const val = await AsyncStorage.getItem(KEYS.THEME);
    if (val === null) {
      return null;
    }
    if (val !== 'PAPER' && val !== 'DARK') {
      throw new Error(`Invalid persisted theme: ${val}.`);
    }
    return val as ThemeType;
  },

  async setAutoScroll(enabled: boolean) {
    await setBoolean(KEYS.AUTO_SCROLL, enabled);
  },
  async getAutoScroll() {
    return await getBoolean(KEYS.AUTO_SCROLL);
  },

  async setShowTranscription(enabled: boolean) {
    await setBoolean(KEYS.SHOW_TRANSCRIPTION, enabled);
  },
  async getShowTranscription() {
    return await getBoolean(KEYS.SHOW_TRANSCRIPTION);
  },
};
