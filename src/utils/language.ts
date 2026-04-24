import * as Localization from 'expo-localization';
import type { LanguageCode } from '../i18n/types';

export function inferDeviceLanguage(): LanguageCode {
  const locale = Localization.getLocales()[0];
  if (!locale) {
    return 'en';
  }

  const tag = locale.languageTag.toLowerCase();
  if (tag.startsWith('tr')) {
    return 'tr';
  }
  return 'en';
}
