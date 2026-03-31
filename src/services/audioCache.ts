import * as FileSystem from 'expo-file-system/legacy';
import { unzip } from 'react-native-zip-archive';
import { buildVerseFileName } from '../utils/formatters';

const DEFAULT_AUDIO_URL = 'https://everyayah.com/data/Ghamadi_40kbps';
const AUDIO_BUNDLE_URL = 'https://github.com/Yakrel/kuran-ayet-ezberle/releases/latest/download/Ghamadi_40kbps.zip';

const CONFIGURED_MIRROR_URL = process.env.EXPO_PUBLIC_AUDIO_MIRROR_URL?.trim();
const AUDIO_SOURCE_URLS = [CONFIGURED_MIRROR_URL, DEFAULT_AUDIO_URL]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/+$/, ''))
  .filter((value, index, values) => values.indexOf(value) === index);
const DOWNLOAD_RETRY_DELAYS_MS = [0, 500, 1500];

function getCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('Audio cache directory is unavailable on this device.');
  }
  return `${base}verse-audio-cache/`;
}

async function ensureCacheDir(): Promise<void> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export function buildRemoteVerseAudioUrl(surahId: number, verseNumber: number): string {
  const fileName = buildVerseFileName(surahId, verseNumber);
  const baseUrl = AUDIO_SOURCE_URLS[0];
  if (!baseUrl) {
    throw new Error('No audio source URL is configured.');
  }
  return `${baseUrl}/${fileName}`;
}

export async function getPreferredVerseAudioUri(surahId: number, verseNumber: number): Promise<string> {
  const fileName = buildVerseFileName(surahId, verseNumber);
  const localUri = `${getCacheDir()}${fileName}`;
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    return localUri;
  }

  return buildRemoteVerseAudioUrl(surahId, verseNumber);
}

async function deleteFileIfExists(fileUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadWithRetry(remoteUrl: string, localUri: string, onProgress?: (progress: number) => void): Promise<string> {
  let lastError: Error | null = null;

  for (const delayMs of DOWNLOAD_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    try {
      await deleteFileIfExists(localUri);
      
      const downloadResumable = FileSystem.createDownloadResumable(
        remoteUrl,
        localUri,
        {},
        (downloadProgress) => {
          const expectedBytes = downloadProgress.totalBytesExpectedToWrite;
          const progress = expectedBytes > 0 ? downloadProgress.totalBytesWritten / expectedBytes : 0;
          onProgress?.(progress);
        }
      );

      const download = await downloadResumable.downloadAsync();
      if (!download || download.status !== 200) {
        throw new Error(`Audio download failed: ${download?.status ?? 'unknown'}`);
      }

      return localUri;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Audio download failed');
      await deleteFileIfExists(localUri);
    }
  }

  throw lastError ?? new Error('Audio download failed');
}

export async function getOrDownloadVerseAudio(surahId: number, verseNumber: number): Promise<string> {
  const fileName = buildVerseFileName(surahId, verseNumber);
  const localUri = `${getCacheDir()}${fileName}`;

  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    return localUri;
  }

  await ensureCacheDir();

  let lastError: Error | null = null;
  for (const sourceUrl of AUDIO_SOURCE_URLS) {
    try {
      return await downloadWithRetry(`${sourceUrl}/${fileName}`, localUri);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Audio download failed');
    }
  }

  throw lastError ?? new Error('Audio download failed');
}

export async function getAvailableSpaceMB(): Promise<number> {
  try {
    const freeBytes = await FileSystem.getFreeDiskStorageAsync();
    return freeBytes / (1024 * 1024);
  } catch (e) {
    // If check fails, return a safe high number to not block download unnecessarily
    return 2048; 
  }
}

export async function downloadAudioBundle(
  onProgress?: (type: 'download' | 'unzip', progress: number) => void
): Promise<void> {
  const cacheDir = getCacheDir();
  await ensureCacheDir();

  const tempZipUri = `${FileSystem.cacheDirectory}audio-bundle.zip`;
  
  try {
    // 1. Download ZIP
    await downloadWithRetry(AUDIO_BUNDLE_URL, tempZipUri, (progress) => {
      onProgress?.('download', progress);
    });

    // 2. Unzip
    // The zip contains a folder 'Ghamadi_40kbps', we need to extract its content to cacheDir
    const tempExtractDir = `${FileSystem.cacheDirectory}audio-extract/`;
    await deleteFileIfExists(tempExtractDir);
    await FileSystem.makeDirectoryAsync(tempExtractDir, { intermediates: true });

    onProgress?.('unzip', 0);
    await unzip(tempZipUri, tempExtractDir);
    onProgress?.('unzip', 1);

    // 3. Move files to cache directory
    const extractedFolder = `${tempExtractDir}Ghamadi_40kbps/`;
    const files = await FileSystem.readDirectoryAsync(extractedFolder);
    
    for (const file of files) {
      const destination = `${cacheDir}${file}`;
      await deleteFileIfExists(destination);
      await FileSystem.moveAsync({
        from: `${extractedFolder}${file}`,
        to: destination
      });
    }

    // Clean up
    await deleteFileIfExists(tempZipUri);
    await deleteFileIfExists(tempExtractDir);
  } catch (error) {
    await deleteFileIfExists(tempZipUri);
    throw error;
  }
}

export async function downloadSurahAudio(
  surahId: number,
  verseCount: number,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 1; i <= verseCount; i += 1) {
    await getOrDownloadVerseAudio(surahId, i);
    onProgress?.(i, verseCount);
  }
}

export async function clearAllDownloads(): Promise<void> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
    await ensureCacheDir();
  }
}

export async function getCachedAudioFileNames(): Promise<Set<string>> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    return new Set();
  }

  return new Set(await FileSystem.readDirectoryAsync(dir));
}

export async function getCacheStats(): Promise<{ bytes: number; files: number; megabytes: number }> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    return { bytes: 0, files: 0, megabytes: 0 };
  }

  const files = await FileSystem.readDirectoryAsync(dir);
  let totalSize = 0;
  let existingFiles = 0;

  for (const file of files) {
    const fileInfo = await FileSystem.getInfoAsync(`${dir}${file}`);
    if (fileInfo.exists && !fileInfo.isDirectory) {
      totalSize += fileInfo.size ?? 0;
      existingFiles += 1;
    }
  }

  return {
    bytes: totalSize,
    files: existingFiles,
    megabytes: totalSize / (1024 * 1024),
  };
}

export async function getCacheSize(): Promise<number> {
  const stats = await getCacheStats();
  return stats.megabytes;
}
