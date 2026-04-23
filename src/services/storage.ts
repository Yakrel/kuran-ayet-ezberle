import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeType } from '../constants/colors';

const KEYS = {
  LANGUAGE: '@app_language',
  QURAN_FONT: '@app_quran_font',
  PRACTICE_STATE: '@app_practice_state',
  SELECTED_SURAH: '@app_selected_surah',
  SELECTED_TRANSLATION: '@app_selected_translation',
  THEME: '@app_theme',
  AUTO_SCROLL: '@app_auto_scroll',
  ONBOARDING_DONE: '@app_onboarding_done',
};

async function setBoolean(key: string, value: boolean) {
  await AsyncStorage.setItem(key, value ? '1' : '0');
}

async function getBoolean(key: string, fallback = false) {
  const value = await AsyncStorage.getItem(key);
  return value === null ? fallback : value === '1';
}

export const Storage = {
  async setOnboardingDone(done: boolean) {
    await setBoolean(KEYS.ONBOARDING_DONE, done);
  },
  async getOnboardingDone() {
    return await getBoolean(KEYS.ONBOARDING_DONE);
  },
  async setLanguage(lang: string) {
    await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
  },
  async getLanguage() {
    return await AsyncStorage.getItem(KEYS.LANGUAGE);
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
    const parsed = val ? Number(val) : null;
    return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },

  async setPracticeState(value: unknown) {
    await AsyncStorage.setItem(KEYS.PRACTICE_STATE, JSON.stringify(value));
  },
  async getPracticeState() {
    const val = await AsyncStorage.getItem(KEYS.PRACTICE_STATE);
    if (!val) {
      return null;
    }

    try {
      return JSON.parse(val) as unknown;
    } catch {
      return null;
    }
  },

  async setSelectedTranslation(id: number) {
    await AsyncStorage.setItem(KEYS.SELECTED_TRANSLATION, String(id));
  },
  async getSelectedTranslation() {
    const val = await AsyncStorage.getItem(KEYS.SELECTED_TRANSLATION);
    return val ? Number(val) : null;
  },

  async setTheme(themeType: ThemeType) {
    await AsyncStorage.setItem(KEYS.THEME, themeType);
  },
  async getTheme() {
    const val = await AsyncStorage.getItem(KEYS.THEME);
    return val === 'PAPER' || val === 'DARK' ? (val as ThemeType) : null;
  },

  async setAutoScroll(enabled: boolean) {
    await setBoolean(KEYS.AUTO_SCROLL, enabled);
  },
  async getAutoScroll() {
    return await getBoolean(KEYS.AUTO_SCROLL, true);
  },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },

  async getItem(key: string) {
    return await AsyncStorage.getItem(key);
  },

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  },
};
