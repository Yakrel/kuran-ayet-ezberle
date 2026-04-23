import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const LEGACY_CLEANUP_FLAG = '@app_legacy_audio_cleanup_v1';
const LEGACY_AUDIO_CACHE_DIR = 'ayah-audio-cache/';
const LEGACY_STORAGE_KEYS = [
  '@app_ayah_audio_cache_index_v2',
  '@app_full_download_complete',
  '@app_ayah_tracking',
  '@app_last_verse',
  '@app_playback_session',
];

async function deleteLegacyAudioCacheAt(baseUri: string | null | undefined) {
  if (!baseUri) {
    return;
  }

  const legacyCacheUri = `${baseUri}${LEGACY_AUDIO_CACHE_DIR}`;
  try {
    const info = await FileSystem.getInfoAsync(legacyCacheUri);
    if (info.exists) {
      await FileSystem.deleteAsync(legacyCacheUri, { idempotent: true });
    }
  } catch {
    // Cleanup is best-effort; the legacy path is not used by current playback.
  }
}

export async function cleanupLegacyAyahPlaybackState() {
  const hasCleaned = await AsyncStorage.getItem(LEGACY_CLEANUP_FLAG);
  if (hasCleaned === '1') {
    return;
  }

  await Promise.all([
    deleteLegacyAudioCacheAt(FileSystem.documentDirectory),
    deleteLegacyAudioCacheAt(FileSystem.cacheDirectory),
    AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS),
  ]);
  await AsyncStorage.setItem(LEGACY_CLEANUP_FLAG, '1');
}
