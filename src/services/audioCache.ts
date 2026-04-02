import * as FileSystem from 'expo-file-system/legacy';
import { Storage } from './storage';
import { buildVerseFileName } from '../utils/formatters';

const DEFAULT_AUDIO_URL = 'https://everyayah.com/data/Ghamadi_40kbps';
const CONFIGURED_MIRROR_URL = process.env.EXPO_PUBLIC_AUDIO_MIRROR_URL?.trim();
const AUDIO_SOURCE_URLS = [CONFIGURED_MIRROR_URL, DEFAULT_AUDIO_URL]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/+$/, ''))
  .filter((value, index, values) => values.indexOf(value) === index);

const CACHE_DIR_NAME = 'ayah-audio-cache/';
const CACHE_INDEX_KEY = '@app_ayah_audio_cache_index_v2';
const LIVE_CACHE_LIMIT_BYTES = 256 * 1024 * 1024;
const LIVE_CACHE_PRUNE_TARGET_BYTES = 192 * 1024 * 1024;
const PARTIAL_FILE_SUFFIX = '.part';

type VerseRef = {
  surahId: number;
  verseNumber: number;
};

type CacheEntryStatus = 'ready';

export type AudioCacheEntry = {
  fileName: string;
  surahId: number;
  verseNumber: number;
  sizeBytes: number;
  lastAccessedAt: number;
  pinnedOffline: boolean;
  status: CacheEntryStatus;
};

type AudioCacheIndex = Record<string, AudioCacheEntry>;

export type AudioDownloadPhase = 'idle' | 'downloading' | 'cancelling';

export type AudioBundleDownloadProgress = {
  phase: AudioDownloadPhase;
  current: number;
  total: number;
  percent: number;
};

type CachedVerseAudio = {
  uri: string;
  isLocal: boolean;
};

type DownloadJobController = {
  id: string;
  cancelled: boolean;
};

type DownloadOptions = {
  pinnedOffline: boolean;
  controller?: DownloadJobController | null;
};

let cacheIndexPromise: Promise<AudioCacheIndex> | null = null;
let activeOfflineDownloadPromise: Promise<void> | null = null;
let activeOfflineProgress: AudioBundleDownloadProgress | null = null;
let activeOfflineController: DownloadJobController | null = null;
let controllerSequence = 0;

const inflightDownloads = new Map<string, Promise<string>>();
const activeResumables = new Map<string, FileSystem.DownloadResumable>();
const activeTaskPromises = new Set<Promise<unknown>>();
const activeControllers = new Set<DownloadJobController>();

function getCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('Audio cache directory is unavailable on this device.');
  }

  return `${base}${CACHE_DIR_NAME}`;
}

function getCacheFileUri(fileName: string) {
  return `${getCacheDir()}${fileName}`;
}

function getPartialFileUri(fileName: string) {
  return `${getCacheFileUri(fileName)}${PARTIAL_FILE_SUFFIX}`;
}

function createController(): DownloadJobController {
  const controller = {
    id: `job-${Date.now()}-${controllerSequence}`,
    cancelled: false,
  };
  controllerSequence += 1;
  activeControllers.add(controller);
  return controller;
}

function releaseController(controller?: DownloadJobController | null) {
  if (controller) {
    activeControllers.delete(controller);
  }
}

function assertNotCancelled(controller?: DownloadJobController | null) {
  if (controller?.cancelled) {
    throw new Error('download_cancelled');
  }
}

function trackTaskPromise<T>(promise: Promise<T>): Promise<T> {
  activeTaskPromises.add(promise);
  return promise.finally(() => {
    activeTaskPromises.delete(promise);
  });
}

async function ensureCacheDir() {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

function listAllVerseRefs(): VerseRef[] {
  const quranData = require('../../assets/data/quran.json') as { surahs: Array<{ id: number; verse_count: number }> };
  return quranData.surahs.flatMap((surah) =>
    Array.from({ length: surah.verse_count }, (_, index) => ({
      surahId: surah.id,
      verseNumber: index + 1,
    }))
  );
}

async function readCacheIndex(): Promise<AudioCacheIndex> {
  if (!cacheIndexPromise) {
    cacheIndexPromise = (async () => {
      const raw = await Storage.getItem(CACHE_INDEX_KEY);
      if (!raw) {
        return {};
      }

      try {
        const parsed = JSON.parse(raw) as AudioCacheIndex;
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    })();
  }

  return await cacheIndexPromise;
}

async function writeCacheIndex(index: AudioCacheIndex) {
  cacheIndexPromise = Promise.resolve(index);
  await Storage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
}

async function mutateCacheIndex(
  updater: (current: AudioCacheIndex) => AudioCacheIndex | Promise<AudioCacheIndex>
) {
  const current = await readCacheIndex();
  const next = await updater({ ...current });
  await writeCacheIndex(next);
  return next;
}

async function clearCacheIndex() {
  cacheIndexPromise = Promise.resolve({});
  await Storage.removeItem(CACHE_INDEX_KEY);
}

async function getFileInfo(fileUri: string) {
  const info = await FileSystem.getInfoAsync(fileUri);
  return info.exists && !info.isDirectory ? info : null;
}

function isReadyEntry(entry: AudioCacheEntry | undefined): entry is AudioCacheEntry {
  return Boolean(entry && entry.status === 'ready');
}

async function removeFileIfExists(fileUri: string) {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  }
}

async function cleanupPartialFiles() {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    return;
  }

  const files = await FileSystem.readDirectoryAsync(dir);
  const partials = files.filter((file) => file.endsWith(PARTIAL_FILE_SUFFIX));
  for (const file of partials) {
    await removeFileIfExists(`${dir}${file}`);
  }
}

async function syncIndexWithFilesystem(index: AudioCacheIndex) {
  const next = { ...index };

  for (const [fileName, entry] of Object.entries(index)) {
    if (!isReadyEntry(entry)) {
      delete next[fileName];
      continue;
    }

    const fileInfo = await getFileInfo(getCacheFileUri(fileName));
    if (!fileInfo) {
      delete next[fileName];
      continue;
    }

    if ((fileInfo.size ?? 0) <= 0) {
      await removeFileIfExists(getCacheFileUri(fileName));
      delete next[fileName];
      continue;
    }

    if ((fileInfo.size ?? 0) !== entry.sizeBytes) {
      next[fileName] = {
        ...entry,
        sizeBytes: fileInfo.size ?? entry.sizeBytes,
      };
    }
  }

  if (JSON.stringify(next) !== JSON.stringify(index)) {
    await writeCacheIndex(next);
  }

  return next;
}

function buildRemoteVerseAudioUrl(surahId: number, verseNumber: number): string {
  const fileName = buildVerseFileName(surahId, verseNumber);
  const baseUrl = AUDIO_SOURCE_URLS[0];
  if (!baseUrl) {
    throw new Error('No audio source URL is configured.');
  }

  return `${baseUrl}/${fileName}`;
}

async function setReadyEntry(params: {
  fileName: string;
  surahId: number;
  verseNumber: number;
  fileUri: string;
  pinnedOffline: boolean;
}) {
  const info = await getFileInfo(params.fileUri);
  if (!info || (info.size ?? 0) <= 0) {
    throw new Error(`Downloaded audio file is invalid: ${params.fileName}`);
  }

  await mutateCacheIndex((current) => {
    const previous = current[params.fileName];
    current[params.fileName] = {
      fileName: params.fileName,
      surahId: params.surahId,
      verseNumber: params.verseNumber,
      sizeBytes: info.size ?? 0,
      lastAccessedAt: Date.now(),
      pinnedOffline: params.pinnedOffline || previous?.pinnedOffline || false,
      status: 'ready',
    };
    return current;
  });
}

async function removeIndexEntry(fileName: string) {
  await mutateCacheIndex((current) => {
    delete current[fileName];
    return current;
  });
}

async function pruneLiveCacheIfNeeded() {
  const index = await syncIndexWithFilesystem(await readCacheIndex());
  const entries = Object.values(index);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  if (totalBytes <= LIVE_CACHE_LIMIT_BYTES) {
    return;
  }

  const removable = entries
    .filter((entry) => !entry.pinnedOffline)
    .sort((left, right) => left.lastAccessedAt - right.lastAccessedAt);

  let nextTotalBytes = totalBytes;
  const nextIndex = { ...index };

  for (const entry of removable) {
    if (nextTotalBytes <= LIVE_CACHE_PRUNE_TARGET_BYTES) {
      break;
    }

    await removeFileIfExists(getCacheFileUri(entry.fileName));
    delete nextIndex[entry.fileName];
    nextTotalBytes -= entry.sizeBytes;
  }

  await writeCacheIndex(nextIndex);
}

async function downloadVerseToCache(
  surahId: number,
  verseNumber: number,
  options: DownloadOptions
): Promise<string> {
  const { pinnedOffline, controller } = options;
  const fileName = buildVerseFileName(surahId, verseNumber);
  const inflightKey = `${fileName}:${pinnedOffline ? 'offline' : 'live'}`;
  const inflight = inflightDownloads.get(inflightKey);
  if (inflight) {
    return await inflight;
  }

  const promise = trackTaskPromise((async () => {
    await ensureCacheDir();
    await cleanupPartialFiles();
    assertNotCancelled(controller);

    const fileUri = getCacheFileUri(fileName);
    const partialUri = getPartialFileUri(fileName);
    const index = await syncIndexWithFilesystem(await readCacheIndex());
    const entry = index[fileName];
    const existing = await getFileInfo(fileUri);
    if (existing && isReadyEntry(entry)) {
      await setReadyEntry({ fileName, surahId, verseNumber, fileUri, pinnedOffline });
      return fileUri;
    }

    await removeFileIfExists(fileUri);
    await removeFileIfExists(partialUri);
    await removeIndexEntry(fileName);
    assertNotCancelled(controller);

    const remoteUrl = buildRemoteVerseAudioUrl(surahId, verseNumber);
    const resumableKey = controller ? `${controller.id}:${fileName}` : fileName;
    const downloadResumable = FileSystem.createDownloadResumable(remoteUrl, partialUri, {});
    activeResumables.set(resumableKey, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      assertNotCancelled(controller);
      if (!result || result.status !== 200) {
        throw new Error(`Audio download failed for ${fileName}.`);
      }

      await removeFileIfExists(fileUri);
      await FileSystem.moveAsync({ from: partialUri, to: fileUri });
      await setReadyEntry({ fileName, surahId, verseNumber, fileUri, pinnedOffline });
      if (!pinnedOffline) {
        await pruneLiveCacheIfNeeded();
      }

      return fileUri;
    } catch (error) {
      await removeFileIfExists(partialUri);
      await removeFileIfExists(fileUri);
      await removeIndexEntry(fileName);
      if (error instanceof Error && error.message === 'download_cancelled') {
        throw error;
      }

      if (controller?.cancelled) {
        throw new Error('download_cancelled');
      }

      throw error;
    } finally {
      activeResumables.delete(resumableKey);
    }
  })()).finally(() => {
    inflightDownloads.delete(inflightKey);
  });

  inflightDownloads.set(inflightKey, promise);
  return await promise;
}

async function cancelController(controller: DownloadJobController | null) {
  if (!controller) {
    return;
  }

  controller.cancelled = true;
  const resumables = Array.from(activeResumables.entries())
    .filter(([key]) => key.startsWith(`${controller.id}:`))
    .map(([, resumable]) => resumable);

  await Promise.allSettled(
    resumables.map(async (resumable) => {
      try {
        await resumable.pauseAsync();
      } catch {
        // Best-effort cancellation.
      }
    })
  );
}

async function cancelAllControllers() {
  const controllers = Array.from(activeControllers);
  await Promise.all(controllers.map((controller) => cancelController(controller)));
}

export async function getPreferredVerseAudioUri(surahId: number, verseNumber: number): Promise<string> {
  const { uri } = await getVerseAudioForPlayback(surahId, verseNumber);
  return uri;
}

export async function getVerseAudioForPlayback(surahId: number, verseNumber: number): Promise<CachedVerseAudio> {
  const fileName = buildVerseFileName(surahId, verseNumber);
  const fileUri = getCacheFileUri(fileName);
  const index = await syncIndexWithFilesystem(await readCacheIndex());
  const entry = index[fileName];
  const fileInfo = await getFileInfo(fileUri);
  if (!fileInfo || !isReadyEntry(entry)) {
    const localUri = await downloadVerseToCache(surahId, verseNumber, { pinnedOffline: false });
    return { uri: localUri, isLocal: true };
  }

  await setReadyEntry({
    fileName,
    surahId,
    verseNumber,
    fileUri,
    pinnedOffline: false,
  });
  return { uri: fileUri, isLocal: true };
}

export async function prefetchVerseAudio(
  surahId: number,
  verseNumber: number,
  pinnedOffline = false,
  controller?: DownloadJobController | null
): Promise<string> {
  return await downloadVerseToCache(surahId, verseNumber, { pinnedOffline, controller });
}

export async function prefetchVerseRange(
  verses: VerseRef[],
  pinnedOffline = false,
  controller?: DownloadJobController | null
) {
  for (const verse of verses) {
    assertNotCancelled(controller);
    await prefetchVerseAudio(verse.surahId, verse.verseNumber, pinnedOffline, controller);
  }
}

export async function downloadSurahAudio(
  surahId: number,
  verseCount: number,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const controller = createController();
  try {
    for (let verseNumber = 1; verseNumber <= verseCount; verseNumber += 1) {
      await downloadVerseToCache(surahId, verseNumber, { pinnedOffline: true, controller });
      onProgress?.(verseNumber, verseCount);
    }
  } finally {
    releaseController(controller);
  }
}

export async function downloadAudioBundle(
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<'completed'> {
  if (activeOfflineDownloadPromise) {
    await activeOfflineDownloadPromise;
    return 'completed';
  }

  const verses = listAllVerseRefs();
  const controller = createController();
  activeOfflineController = controller;
  activeOfflineDownloadPromise = trackTaskPromise((async () => {
    const total = verses.length;
    let current = 0;
    activeOfflineProgress = { phase: 'downloading', current, total, percent: 0 };
    onProgress?.(activeOfflineProgress);

    for (const verse of verses) {
      assertNotCancelled(controller);
      await downloadVerseToCache(verse.surahId, verse.verseNumber, {
        pinnedOffline: true,
        controller,
      });
      current += 1;
      activeOfflineProgress = {
        phase: 'downloading',
        current,
        total,
        percent: Math.round((current / total) * 100),
      };
      onProgress?.(activeOfflineProgress);
    }

    await Storage.setDownloadComplete(true);
  })());

  try {
    await activeOfflineDownloadPromise;
    activeOfflineProgress = {
      phase: 'idle',
      current: verses.length,
      total: verses.length,
      percent: 100,
    };
    onProgress?.(activeOfflineProgress);
    return 'completed';
  } finally {
    releaseController(controller);
    activeOfflineController = null;
    activeOfflineDownloadPromise = null;
  }
}

export async function resumeAudioBundleDownload(
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<'completed'> {
  return await downloadAudioBundle(onProgress);
}

export async function getPendingAudioBundleDownload(): Promise<AudioBundleDownloadProgress | null> {
  return activeOfflineProgress;
}

export async function pauseActiveAudioBundleDownload(): Promise<boolean> {
  return false;
}

export async function cancelAudioBundleDownload(): Promise<void> {
  if (!activeOfflineController && activeTaskPromises.size === 0) {
    activeOfflineProgress = null;
    return;
  }

  activeOfflineProgress = activeOfflineProgress
    ? { ...activeOfflineProgress, phase: 'cancelling' }
    : { phase: 'cancelling', current: 0, total: 0, percent: 0 };

  await cancelAllControllers();
  await Promise.allSettled(Array.from(activeTaskPromises));
  activeOfflineProgress = null;
}

export async function clearAllDownloads(): Promise<void> {
  await cancelAudioBundleDownload();

  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }

  activeOfflineProgress = null;
  await clearCacheIndex();
  await Storage.setDownloadComplete(false);
}

export async function getCachedAudioFileNames(): Promise<Set<string>> {
  const index = await syncIndexWithFilesystem(await readCacheIndex());
  return new Set(Object.keys(index));
}

export async function getCacheStats(): Promise<{
  bytes: number;
  files: number;
  megabytes: number;
  readyVerses: number;
  offlineReady: boolean;
}> {
  await ensureCacheDir();
  await cleanupPartialFiles();
  const index = await syncIndexWithFilesystem(await readCacheIndex());
  const entries = Object.values(index);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);

  return {
    bytes: totalBytes,
    files: entries.length,
    megabytes: Number((totalBytes / (1024 * 1024)).toFixed(1)),
    readyVerses: entries.length,
    offlineReady: await Storage.getDownloadComplete(),
  };
}

export async function getCacheSize(): Promise<number> {
  const stats = await getCacheStats();
  return stats.megabytes;
}

export async function getAvailableSpaceMB(): Promise<number> {
  try {
    const freeBytes = await FileSystem.getFreeDiskStorageAsync();
    return freeBytes / (1024 * 1024);
  } catch {
    return 2048;
  }
}
