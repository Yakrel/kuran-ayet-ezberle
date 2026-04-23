import { useCallback, useEffect, useState } from 'react';
import type { ThemeType } from '../constants/colors';
import type { QuranFontId } from '../constants/quranFonts';
import type { LanguageCode } from '../i18n/types';
import { Storage } from '../services/storage';
import { cleanupLegacyAyahPlaybackState } from '../services/legacyCleanup';
import { inferDeviceLanguage } from '../utils/language';
import {
  DEFAULT_APP_SETTINGS,
  resolveInitialAppSettings,
  resolveTranslationAfterLanguageChange,
  type AppSettingsState,
  type PracticeState,
  type PersistedAppSettings,
} from '../utils/appSettings';

type SetStateAction<T> = T | ((previous: T) => T);

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettingsState>(DEFAULT_APP_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadSettings() {
      await cleanupLegacyAyahPlaybackState();

      const fallbackLanguage = inferDeviceLanguage();
      const persisted: PersistedAppSettings = {
        language: (await Storage.getLanguage()) as LanguageCode | null,
        selectedTranslationAuthorId: await Storage.getSelectedTranslation(),
        selectedSurahId: await Storage.getSelectedSurah(),
        selectedQuranFontId: (await Storage.getQuranFont()) as QuranFontId | null,
        themeType: (await Storage.getTheme()) as ThemeType | null,
        isAutoScrollEnabled: await Storage.getAutoScroll(),
        practiceState: await Storage.getPracticeState(),
      };

      const { nextState, shouldPersistTranslation } = resolveInitialAppSettings(persisted, fallbackLanguage);
      if (!isActive) {
        return;
      }

      setSettings(nextState);
      setIsHydrated(true);

      if (persisted.language !== nextState.language) {
        void Storage.setLanguage(nextState.language);
      }
      if (shouldPersistTranslation) {
        void Storage.setSelectedTranslation(nextState.selectedTranslationAuthorId);
      }
      if (persisted.themeType !== nextState.themeType) {
        void Storage.setTheme(nextState.themeType);
      }
    }

    void loadSettings();

    return () => {
      isActive = false;
    };
  }, []);

  const setPartialSettings = useCallback(
    <K extends keyof AppSettingsState>(key: K, action: SetStateAction<AppSettingsState[K]>) => {
      setSettings((previous) => ({
        ...previous,
        [key]: typeof action === 'function' ? (action as (value: AppSettingsState[K]) => AppSettingsState[K])(previous[key]) : action,
      }));
    },
    []
  );

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setSettings((previous) => {
      const nextTranslationAuthorId = resolveTranslationAfterLanguageChange(
        previous.selectedTranslationAuthorId,
        nextLanguage
      );

      void Storage.setLanguage(nextLanguage);
      if (nextTranslationAuthorId !== previous.selectedTranslationAuthorId) {
        void Storage.setSelectedTranslation(nextTranslationAuthorId);
      }

      return {
        ...previous,
        language: nextLanguage,
        selectedTranslationAuthorId: nextTranslationAuthorId,
      };
    });
  }, []);

  const setSelectedTranslationAuthorId = useCallback((nextTranslationAuthorId: number) => {
    setPartialSettings('selectedTranslationAuthorId', nextTranslationAuthorId);
    void Storage.setSelectedTranslation(nextTranslationAuthorId);
  }, [setPartialSettings]);

  const setSelectedSurahId = useCallback((nextSurahId: number | null) => {
    setPartialSettings('selectedSurahId', nextSurahId);
    if (nextSurahId !== null) {
      void Storage.setSelectedSurah(nextSurahId);
    }
  }, [setPartialSettings]);

  const setSelectedQuranFontId = useCallback((nextFontId: QuranFontId) => {
    setPartialSettings('selectedQuranFontId', nextFontId);
    void Storage.setQuranFont(nextFontId);
  }, [setPartialSettings]);

  const setThemeType = useCallback((nextThemeType: ThemeType) => {
    setPartialSettings('themeType', nextThemeType);
    void Storage.setTheme(nextThemeType);
  }, [setPartialSettings]);

  const setIsAutoScrollEnabled = useCallback((enabled: boolean) => {
    setPartialSettings('isAutoScrollEnabled', enabled);
    void Storage.setAutoScroll(enabled);
  }, [setPartialSettings]);

  const setPracticeState = useCallback((nextPracticeState: PracticeState) => {
    setPartialSettings('practiceState', nextPracticeState);
    void Storage.setPracticeState(nextPracticeState);
  }, [setPartialSettings]);

  return {
    ...settings,
    isHydrated,
    setLanguage,
    setSelectedTranslationAuthorId,
    setSelectedSurahId,
    setSelectedQuranFontId,
    setThemeType,
    setIsAutoScrollEnabled,
    setPracticeState,
  };
}
