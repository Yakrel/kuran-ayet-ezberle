import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReciterId } from '../constants/reciters';
import type { ThemeType } from '../constants/colors';

const KEYS = {
  LANGUAGE: '@app_language',
  QURAN_FONT: '@app_quran_font',
  SELECTED_SURAH: '@app_selected_surah',
  SELECTED_TRANSLATION: '@app_selected_translation',
  SELECTED_RECITER: '@app_selected_reciter',
  THEME: '@app_theme',
  AUTO_SCROLL: '@app_auto_scroll',
  AYAH_TRACKING: '@app_ayah_tracking',
  LAST_VERSE: '@app_last_verse',
  DOWNLOAD_COMPLETE_PREFIX: '@app_full_download_complete',
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
  async setDownloadComplete(reciterId: ReciterId, complete: boolean) {
    await setBoolean(`${KEYS.DOWNLOAD_COMPLETE_PREFIX}:${reciterId}`, complete);
  },
  async getDownloadComplete(reciterId: ReciterId) {
    return await getBoolean(`${KEYS.DOWNLOAD_COMPLETE_PREFIX}:${reciterId}`);
  },

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
    return val ? Number(val) : null;
  },

  async setSelectedTranslation(id: number) {
    await AsyncStorage.setItem(KEYS.SELECTED_TRANSLATION, String(id));
  },
  async getSelectedTranslation() {
    const val = await AsyncStorage.getItem(KEYS.SELECTED_TRANSLATION);
    return val ? Number(val) : null;
  },

  async setSelectedReciter(reciterId: ReciterId) {
    await AsyncStorage.setItem(KEYS.SELECTED_RECITER, reciterId);
  },
  async getSelectedReciter() {
    const val = await AsyncStorage.getItem(KEYS.SELECTED_RECITER);
    return val === 'ghamdi' || val === 'mishary' || val === 'maher' || val === 'minshawy'
      ? (val as ReciterId)
      : null;
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

  async setAyahTracking(enabled: boolean) {
    await setBoolean(KEYS.AYAH_TRACKING, enabled);
  },
  async getAyahTracking() {
    return await getBoolean(KEYS.AYAH_TRACKING, false);
  },

  async setLastVerse(surahId: number, verseNumber: number) {
    await AsyncStorage.setItem(KEYS.LAST_VERSE, JSON.stringify({ surahId, verseNumber }));
  },
  async getLastVerse() {
    const val = await AsyncStorage.getItem(KEYS.LAST_VERSE);
    if (!val) {
      return null;
    }

    try {
      const parsed = JSON.parse(val) as { surahId?: number; verseNumber?: number };
      if (typeof parsed.surahId !== 'number' || typeof parsed.verseNumber !== 'number') {
        return null;
      }

      return parsed as { surahId: number; verseNumber: number };
    } catch {
      return null;
    }
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
