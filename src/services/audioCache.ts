import * as FileSystem from 'expo-file-system/legacy';
import { unzip } from 'react-native-zip-archive';
import { Storage, type BundleDownloadPhase, type SavedBundleDownloadState } from './storage';
import { buildVerseFileName } from '../utils/formatters';

const DEFAULT_AUDIO_URL = 'https://everyayah.com/data/Ghamadi_40kbps';
const AUDIO_BUNDLE_URL = 'https://github.com/Yakrel/kuran-ayet-ezberle/releases/latest/download/Ghamadi_40kbps.zip';

const CONFIGURED_MIRROR_URL = process.env.EXPO_PUBLIC_AUDIO_MIRROR_URL?.trim();
const AUDIO_SOURCE_URLS = [CONFIGURED_MIRROR_URL, DEFAULT_AUDIO_URL]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/+$/, ''))
  .filter((value, index, values) => values.indexOf(value) === index);
const DOWNLOAD_RETRY_DELAYS_MS = [0, 500, 1500];
const TEMP_ZIP_FILE_NAME = 'audio-bundle.zip';
const TEMP_EXTRACT_DIR_NAME = 'audio-extract/';

export type AudioBundleDownloadProgress = {
  phase: BundleDownloadPhase;
  current: number;
  total: number;
  percent: number;
};

export type AudioBundleDownloadResult = 'completed' | 'paused';

type SavedDownloadResumable = {
  url: string;
  fileUri: string;
  options?: FileSystem.DownloadOptions;
  resumeData?: string;
};

let activeBundleDownloadResumable: FileSystem.DownloadResumable | null = null;
let activeBundleDownloadPromise: Promise<AudioBundleDownloadResult> | null = null;
let activeBundleProgress: AudioBundleDownloadProgress | null = null;
let pauseRequested = false;

function getCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('Audio cache directory is unavailable on this device.');
  }
  return `${base}verse-audio-cache/`;
}

function getTempZipUri(): string {
  if (!FileSystem.cacheDirectory) {
    throw new Error('Temporary audio download directory is unavailable on this device.');
  }

  return `${FileSystem.cacheDirectory}${TEMP_ZIP_FILE_NAME}`;
}

function getTempExtractDir(): string {
  if (!FileSystem.cacheDirectory) {
    throw new Error('Temporary audio extract directory is unavailable on this device.');
  }

  return `${FileSystem.cacheDirectory}${TEMP_EXTRACT_DIR_NAME}`;
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

function createProgressState(
  phase: BundleDownloadPhase,
  current: number,
  total: number,
  percent: number
): AudioBundleDownloadProgress {
  return {
    phase,
    current,
    total,
    percent: Math.max(0, Math.min(100, percent)),
  };
}

async function persistBundleDownloadState(
  progress: AudioBundleDownloadProgress,
  resumable: SavedDownloadResumable | null = null
): Promise<void> {
  activeBundleProgress = progress;
  const state: SavedBundleDownloadState = {
    ...progress,
    resumable,
  };
  await Storage.setBundleDownloadState(state);
}

function toSavedDownloadResumable(value: unknown): SavedDownloadResumable | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<SavedDownloadResumable>;
  if (typeof candidate.url !== 'string' || typeof candidate.fileUri !== 'string') {
    return null;
  }

  return {
    url: candidate.url,
    fileUri: candidate.fileUri,
    options: candidate.options,
    resumeData: typeof candidate.resumeData === 'string' ? candidate.resumeData : undefined,
  };
}

function createDownloadProgressReporter(
  onProgress: ((progress: AudioBundleDownloadProgress) => void) | undefined
) {
  return async (
    phase: BundleDownloadPhase,
    current: number,
    total: number,
    percent: number,
    resumable: SavedDownloadResumable | null = null
  ) => {
    const progress = createProgressState(phase, current, total, percent);
    onProgress?.(progress);
    await persistBundleDownloadState(progress, resumable);
  };
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

async function downloadBundleArchive(
  savedState: SavedBundleDownloadState | null,
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<AudioBundleDownloadResult> {
  const reportProgress = createDownloadProgressReporter(onProgress);
  const savedResumable = toSavedDownloadResumable(savedState?.resumable);
  const remoteUrl = savedResumable?.url ?? AUDIO_BUNDLE_URL;
  const localUri = savedResumable?.fileUri ?? getTempZipUri();

  if (!savedResumable?.resumeData) {
    await deleteFileIfExists(localUri);
  }

  pauseRequested = false;
  let downloadResumable: FileSystem.DownloadResumable | null = FileSystem.createDownloadResumable(
    remoteUrl,
    localUri,
    savedResumable?.options ?? {},
    (downloadProgress) => {
      const expectedBytes = downloadProgress.totalBytesExpectedToWrite;
      const total = expectedBytes > 0 ? expectedBytes : 100;
      const current = expectedBytes > 0
        ? Math.min(downloadProgress.totalBytesWritten, expectedBytes)
        : 0;
      const percent = expectedBytes > 0
        ? Math.round((downloadProgress.totalBytesWritten / expectedBytes) * 100)
        : 0;
      const snapshot = downloadResumable?.savable() ?? savedResumable;
      void reportProgress('downloading', current, total, percent, snapshot ? toSavedDownloadResumable(snapshot) : null);
    },
    savedResumable?.resumeData
  );
  activeBundleDownloadResumable = downloadResumable;

  await reportProgress(
    'downloading',
    savedState?.current ?? 0,
    savedState?.total ?? 100,
    savedState?.percent ?? 0,
    toSavedDownloadResumable(downloadResumable.savable())
  );

  try {
    const download = savedResumable?.resumeData
      ? await downloadResumable.resumeAsync()
      : await downloadResumable.downloadAsync();

    if (pauseRequested) {
      return 'paused';
    }

    if (!download || download.status !== 200) {
      throw new Error(`Audio download failed: ${download?.status ?? 'unknown'}`);
    }

    await reportProgress('downloading', 100, 100, 100, null);
    return 'completed';
  } catch (error) {
    if (pauseRequested) {
      return 'paused';
    }

    throw error;
  } finally {
    activeBundleDownloadResumable = null;
    downloadResumable = null;
  }
}

async function unzipBundleArchive(onProgress?: (progress: AudioBundleDownloadProgress) => void): Promise<void> {
  const reportProgress = createDownloadProgressReporter(onProgress);
  const tempZipUri = getTempZipUri();
  const tempExtractDir = getTempExtractDir();

  await deleteFileIfExists(tempExtractDir);
  await FileSystem.makeDirectoryAsync(tempExtractDir, { intermediates: true });
  await reportProgress('unzipping', 0, 1, 0, null);
  await unzip(tempZipUri, tempExtractDir);
  await reportProgress('unzipping', 1, 1, 100, null);
}

async function moveBundleFilesIntoCache(onProgress?: (progress: AudioBundleDownloadProgress) => void): Promise<void> {
  const reportProgress = createDownloadProgressReporter(onProgress);
  const cacheDir = getCacheDir();
  const tempExtractDir = getTempExtractDir();
  const extractedFolder = `${tempExtractDir}Ghamadi_40kbps/`;
  const files = await FileSystem.readDirectoryAsync(extractedFolder);

  await reportProgress('moving', 0, Math.max(files.length, 1), 0, null);
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const destination = `${cacheDir}${file}`;
    await deleteFileIfExists(destination);
    await FileSystem.moveAsync({
      from: `${extractedFolder}${file}`,
      to: destination
    });
    const current = index + 1;
    await reportProgress('moving', current, files.length, Math.round((current / files.length) * 100), null);
  }
}

async function cleanupBundleTempFiles(): Promise<void> {
  await deleteFileIfExists(getTempZipUri());
  await deleteFileIfExists(getTempExtractDir());
}

async function runAudioBundleDownload(
  resumeIfPossible: boolean,
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<AudioBundleDownloadResult> {
  if (activeBundleDownloadPromise) {
    return activeBundleDownloadPromise;
  }

  activeBundleDownloadPromise = (async () => {
    const savedState = resumeIfPossible ? await Storage.getBundleDownloadState() : null;
    const nextPhase = savedState?.phase ?? 'downloading';

    try {
      await ensureCacheDir();

      if (nextPhase === 'downloading') {
        const result = await downloadBundleArchive(savedState, onProgress);
        if (result === 'paused') {
          return 'paused';
        }
      } else if (savedState) {
        onProgress?.(createProgressState(savedState.phase, savedState.current, savedState.total, savedState.percent));
      }

      if (nextPhase === 'downloading' || nextPhase === 'unzipping') {
        await unzipBundleArchive(onProgress);
      }

      await moveBundleFilesIntoCache(onProgress);
      await cleanupBundleTempFiles();
      await Storage.clearBundleDownloadState();
      activeBundleProgress = null;
      return 'completed';
    } catch (error) {
      if (!pauseRequested) {
        throw error;
      }
      return 'paused';
    } finally {
      activeBundleDownloadPromise = null;
      pauseRequested = false;
    }
  })();

  return activeBundleDownloadPromise;
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
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<AudioBundleDownloadResult> {
  await Storage.clearBundleDownloadState();
  activeBundleProgress = null;
  return await runAudioBundleDownload(false, onProgress);
}

export async function resumeAudioBundleDownload(
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<AudioBundleDownloadResult> {
  return await runAudioBundleDownload(true, onProgress);
}

export async function getPendingAudioBundleDownload(): Promise<AudioBundleDownloadProgress | null> {
  const savedState = await Storage.getBundleDownloadState();
  if (!savedState) {
    return activeBundleProgress;
  }

  return createProgressState(savedState.phase, savedState.current, savedState.total, savedState.percent);
}

export async function pauseActiveAudioBundleDownload(): Promise<boolean> {
  if (!activeBundleDownloadResumable) {
    return false;
  }

  pauseRequested = true;

  try {
    const pausedState = await activeBundleDownloadResumable.pauseAsync();
    const snapshot = toSavedDownloadResumable(pausedState);
    if (activeBundleProgress) {
      await persistBundleDownloadState(activeBundleProgress, snapshot);
    }
    activeBundleDownloadResumable = null;
    return true;
  } catch {
    pauseRequested = false;
    return false;
  }
}

export async function cancelAudioBundleDownload(): Promise<void> {
  if (activeBundleDownloadResumable) {
    pauseRequested = true;

    try {
      await activeBundleDownloadResumable.pauseAsync();
    } catch {
      // Best effort; cancellation continues with cleanup below.
    }
  }

  activeBundleDownloadResumable = null;
  activeBundleProgress = null;
  activeBundleDownloadPromise = null;
  pauseRequested = false;
  await Storage.clearBundleDownloadState();
  await cleanupBundleTempFiles();
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
