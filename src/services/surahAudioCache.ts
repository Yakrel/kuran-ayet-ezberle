import * as FileSystem from 'expo-file-system/legacy';

export type SurahAudioDownloadProgress = {
  current: number;
  total: number;
  percent: number;
};

const CACHE_DIR_NAME = 'surah-audio-cache/';

function getCacheDir() {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('Audio cache directory is unavailable on this device.');
  }

  return `${base}${CACHE_DIR_NAME}`;
}

function getCacheFileUri(surahId: number) {
  return `${getCacheDir()}${String(surahId).padStart(3, '0')}.mp3`;
}

async function ensureCacheDir() {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function getCachedSurahAudioUri(surahId: number) {
  const fileUri = getCacheFileUri(surahId);
  const info = await FileSystem.getInfoAsync(fileUri);
  return info.exists ? fileUri : null;
}

export async function getPreferredSurahAudioUri(surahId: number, remoteUrl: string) {
  const cachedUri = await getCachedSurahAudioUri(surahId);
  return cachedUri ?? remoteUrl;
}

export async function downloadSurahAudio(
  surahId: number,
  remoteUrl: string,
  onProgress?: (progress: SurahAudioDownloadProgress) => void
) {
  await ensureCacheDir();
  const fileUri = getCacheFileUri(surahId);

  const resumable = FileSystem.createDownloadResumable(
    remoteUrl,
    fileUri,
    {},
    (downloadProgress) => {
      const total = downloadProgress.totalBytesExpectedToWrite || 0;
      const current = downloadProgress.totalBytesWritten || 0;
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      onProgress?.({ current, total, percent });
    }
  );

  const result = await resumable.downloadAsync();
  if (!result || result.status !== 200) {
    throw new Error(`Surah audio download failed for surah ${surahId}.`);
  }

  return fileUri;
}

export async function downloadAllSurahAudio(
  surahAudios: Array<{ surahId: number; remoteUrl: string }>,
  onProgress?: (progress: SurahAudioDownloadProgress) => void
) {
  const total = surahAudios.length;

  for (let index = 0; index < surahAudios.length; index += 1) {
    const item = surahAudios[index];
    await downloadSurahAudio(item.surahId, item.remoteUrl);
    const current = index + 1;
    onProgress?.({
      current,
      total,
      percent: Math.round((current / total) * 100),
    });
  }
}

export async function clearAllSurahAudio() {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}

export async function getSurahAudioCacheStats() {
  await ensureCacheDir();
  const files = await FileSystem.readDirectoryAsync(getCacheDir());
  let totalBytes = 0;

  for (const file of files) {
    const info = await FileSystem.getInfoAsync(`${getCacheDir()}${file}`);
    totalBytes += info.exists && typeof info.size === 'number' ? info.size : 0;
  }

  return {
    files: files.length,
    megabytes: Number((totalBytes / (1024 * 1024)).toFixed(1)),
  };
}
