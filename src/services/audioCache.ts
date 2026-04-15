import * as FileSystem from 'expo-file-system/legacy';
import { Storage } from './storage';
import { DEFAULT_RECITER_ID, getReciterOption, type ReciterId } from '../constants/reciters';
import { buildVerseFileName } from '../utils/formatters';

const CONFIGURED_MIRROR_URL = process.env.EXPO_PUBLIC_AUDIO_MIRROR_URL?.trim();
const CACHE_DIR_NAME = 'ayah-audio-cache/';
const LEGACY_CACHE_INDEX_KEY = '@app_ayah_audio_cache_index_v2';
const CACHE_INDEX_KEY_PREFIX = '@app_ayah_audio_cache_index_v3';
const LIVE_CACHE_LIMIT_BYTES = 256 * 1024 * 1024;
const LIVE_CACHE_PRUNE_TARGET_BYTES = 192 * 1024 * 1024;
const PARTIAL_FILE_SUFFIX = '.part';

export type VerseRef = {
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
  reciterId: ReciterId;
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
  reciterId: ReciterId;
  pinnedOffline: boolean;
  controller?: DownloadJobController | null;
};

type InflightDownload = {
  fileName: string;
  fileUri: string;
  partialUri: string;
  promise: Promise<string>;
  resumable: FileSystem.DownloadResumable | null;
  pinnedOfflineRequested: boolean;
  controllerIds: Set<string>;
  passiveConsumers: number;
};

export type AudioCacheLease = {
  release: () => Promise<void>;
};

const cacheIndexPromises = new Map<ReciterId, Promise<AudioCacheIndex>>();
let activeOfflineDownloadPromise: Promise<void> | null = null;
let activeOfflineProgress: AudioBundleDownloadProgress | null = null;
let activeOfflineController: DownloadJobController | null = null;
let activeOfflineReciterId: ReciterId | null = null;
let controllerSequence = 0;
let cacheMutationChain = Promise.resolve();
const startupMaintenancePromises = new Map<ReciterId, Promise<void>>();

const inflightDownloads = new Map<string, InflightDownload>();
const activeTaskPromises = new Set<Promise<unknown>>();
const activeControllers = new Set<DownloadJobController>();
const leasedFiles = new Map<string, number>();

function getRootCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('Audio cache directory is unavailable on this device.');
  }

  return `${base}${CACHE_DIR_NAME}`;
}

function getCacheDir(reciterId: ReciterId): string {
  return `${getRootCacheDir()}${reciterId}/`;
}

function getScopedFileKey(reciterId: ReciterId, fileName: string) {
  return `${reciterId}:${fileName}`;
}

function getCacheIndexKey(reciterId: ReciterId) {
  return `${CACHE_INDEX_KEY_PREFIX}:${reciterId}`;
}

function getCacheFileUri(reciterId: ReciterId, fileName: string) {
  return `${getCacheDir(reciterId)}${fileName}`;
}

function getPartialFileUri(reciterId: ReciterId, fileName: string) {
  return `${getCacheFileUri(reciterId, fileName)}${PARTIAL_FILE_SUFFIX}`;
}

function getAudioSourceUrls(reciterId: ReciterId) {
  const sources = [
    reciterId === DEFAULT_RECITER_ID ? CONFIGURED_MIRROR_URL : null,
    getReciterOption(reciterId).verseBaseUrl,
  ];

  return sources
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/+$/, ''))
    .filter((value, index, values) => values.indexOf(value) === index);
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

function getQuranData() {
  return require('../../assets/data/quran.json') as { surahs: Array<{ id: number; verse_count: number }> };
}

function listAllVerseRefs(): VerseRef[] {
  const quranData = getQuranData();
  return quranData.surahs.flatMap((surah) =>
    Array.from({ length: surah.verse_count }, (_, index) => ({
      surahId: surah.id,
      verseNumber: index + 1,
    }))
  );
}

function getTotalVerseCount() {
  return getQuranData().surahs.reduce((sum, surah) => sum + surah.verse_count, 0);
}

async function withCacheMutationLock<T>(task: () => Promise<T>): Promise<T> {
  const next = cacheMutationChain.then(task, task);
  cacheMutationChain = next.then(() => undefined, () => undefined);
  return await next;
}

async function ensureCacheDir(reciterId: ReciterId) {
  const rootDir = getRootCacheDir();
  const rootInfo = await FileSystem.getInfoAsync(rootDir);
  if (!rootInfo.exists) {
    await FileSystem.makeDirectoryAsync(rootDir, { intermediates: true });
  }

  const dir = getCacheDir(reciterId);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function readCacheIndex(reciterId: ReciterId): Promise<AudioCacheIndex> {
  const cached = cacheIndexPromises.get(reciterId);
  if (!cached) {
    const nextPromise = (async () => {
      const raw = await Storage.getItem(getCacheIndexKey(reciterId));
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
    cacheIndexPromises.set(reciterId, nextPromise);
  }

  return await (cacheIndexPromises.get(reciterId) as Promise<AudioCacheIndex>);
}

async function writeCacheIndex(reciterId: ReciterId, index: AudioCacheIndex) {
  cacheIndexPromises.set(reciterId, Promise.resolve(index));
  await Storage.setItem(getCacheIndexKey(reciterId), JSON.stringify(index));
}

async function clearCacheIndex(reciterId: ReciterId) {
  cacheIndexPromises.set(reciterId, Promise.resolve({}));
  await Storage.removeItem(getCacheIndexKey(reciterId));
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

async function syncIndexWithFilesystemUnsafe(reciterId: ReciterId, index: AudioCacheIndex) {
  const next = { ...index };

  for (const [fileName, entry] of Object.entries(index)) {
    if (!isReadyEntry(entry)) {
      delete next[fileName];
      continue;
    }

    const fileInfo = await getFileInfo(getCacheFileUri(reciterId, fileName));
    if (!fileInfo || (fileInfo.size ?? 0) <= 0) {
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
    await writeCacheIndex(reciterId, next);
  }

  return next;
}

async function setReadyEntryUnsafe(params: {
  reciterId: ReciterId;
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

  const current = await readCacheIndex(params.reciterId);
  const next = { ...current };
  const previous = next[params.fileName];
  next[params.fileName] = {
    fileName: params.fileName,
    surahId: params.surahId,
    verseNumber: params.verseNumber,
    sizeBytes: info.size ?? 0,
    lastAccessedAt: Date.now(),
    pinnedOffline: params.pinnedOffline || previous?.pinnedOffline || false,
    status: 'ready',
  };
  await writeCacheIndex(params.reciterId, next);
}

async function removeIndexEntryUnsafe(reciterId: ReciterId, fileName: string) {
  const current = await readCacheIndex(reciterId);
  if (!(fileName in current)) {
    return;
  }

  const next = { ...current };
  delete next[fileName];
  await writeCacheIndex(reciterId, next);
}

function buildRemoteVerseAudioUrl(baseUrl: string, surahId: number, verseNumber: number): string {
  const fileName = buildVerseFileName(surahId, verseNumber);
  return `${baseUrl}/${fileName}`;
}

function registerLease(reciterId: ReciterId, fileName: string) {
  const scopedKey = getScopedFileKey(reciterId, fileName);
  leasedFiles.set(scopedKey, (leasedFiles.get(scopedKey) ?? 0) + 1);
}

function unregisterLease(reciterId: ReciterId, fileName: string) {
  const scopedKey = getScopedFileKey(reciterId, fileName);
  const current = leasedFiles.get(scopedKey) ?? 0;
  if (current <= 1) {
    leasedFiles.delete(scopedKey);
    return;
  }

  leasedFiles.set(scopedKey, current - 1);
}

function hasProtectedConsumer(reciterId: ReciterId, fileName: string) {
  const scopedKey = getScopedFileKey(reciterId, fileName);
  return leasedFiles.has(scopedKey) || inflightDownloads.has(scopedKey);
}

async function pruneLiveCacheIfNeeded(reciterId: ReciterId) {
  await withCacheMutationLock(async () => {
    const index = await syncIndexWithFilesystemUnsafe(reciterId, await readCacheIndex(reciterId));
    const entries = Object.values(index);
    const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
    if (totalBytes <= LIVE_CACHE_LIMIT_BYTES) {
      return;
    }

    const removable = entries
      .filter((entry) => !entry.pinnedOffline && !hasProtectedConsumer(reciterId, entry.fileName))
      .sort((left, right) => left.lastAccessedAt - right.lastAccessedAt);

    let nextTotalBytes = totalBytes;
    const nextIndex = { ...index };

    for (const entry of removable) {
      if (nextTotalBytes <= LIVE_CACHE_PRUNE_TARGET_BYTES) {
        break;
      }

      await removeFileIfExists(getCacheFileUri(reciterId, entry.fileName));
      delete nextIndex[entry.fileName];
      nextTotalBytes -= entry.sizeBytes;
    }

    await writeCacheIndex(reciterId, nextIndex);
  });
}

async function reconcileOfflineReadyFlag(reciterId: ReciterId, index?: AudioCacheIndex) {
  const syncedIndex = index ?? await withCacheMutationLock(async () =>
    await syncIndexWithFilesystemUnsafe(reciterId, await readCacheIndex(reciterId))
  );
  const shouldBeComplete = Object.keys(syncedIndex).length === getTotalVerseCount();
  const current = await Storage.getDownloadComplete(reciterId);
  if (current !== shouldBeComplete) {
    await Storage.setDownloadComplete(reciterId, shouldBeComplete);
  }
  return shouldBeComplete;
}

async function cleanupOrphanPartialFiles(reciterId: ReciterId) {
  if (inflightDownloads.size > 0) {
    return;
  }

  await ensureCacheDir(reciterId);
  const dir = getCacheDir(reciterId);
  const files = await FileSystem.readDirectoryAsync(dir);
  const partials = files.filter((file) => file.endsWith(PARTIAL_FILE_SUFFIX));
  await Promise.all(partials.map(async (file) => {
    await removeFileIfExists(`${dir}${file}`);
  }));
}

async function migrateLegacyGhamdiCacheIfNeeded() {
  const rootDir = getRootCacheDir();
  const legacyIndexRaw = await Storage.getItem(LEGACY_CACHE_INDEX_KEY);
  const nextIndexRaw = await Storage.getItem(getCacheIndexKey(DEFAULT_RECITER_ID));
  const ghamdiDir = getCacheDir(DEFAULT_RECITER_ID);

  if (!legacyIndexRaw && nextIndexRaw) {
    return;
  }

  await ensureCacheDir(DEFAULT_RECITER_ID);
  const rootFiles = await FileSystem.readDirectoryAsync(rootDir).catch(() => []);
  const legacyFiles = rootFiles.filter((file) => file.endsWith('.mp3'));

  if (!nextIndexRaw && legacyIndexRaw) {
    await Storage.setItem(getCacheIndexKey(DEFAULT_RECITER_ID), legacyIndexRaw);
  }
  if (legacyIndexRaw) {
    await Storage.removeItem(LEGACY_CACHE_INDEX_KEY);
  }

  if (legacyFiles.length === 0) {
    return;
  }

  for (const file of legacyFiles) {
    const from = `${rootDir}${file}`;
    const to = `${ghamdiDir}${file}`;
    const targetInfo = await FileSystem.getInfoAsync(to);
    if (!targetInfo.exists) {
      await FileSystem.moveAsync({ from, to });
    } else {
      await removeFileIfExists(from);
    }
  }
}

export async function initializeAudioCache(reciterId: ReciterId = DEFAULT_RECITER_ID) {
  if (!startupMaintenancePromises.has(reciterId)) {
    const promise = (async () => {
      if (reciterId === DEFAULT_RECITER_ID) {
        await migrateLegacyGhamdiCacheIfNeeded();
      }
      await cleanupOrphanPartialFiles(reciterId);
      const syncedIndex = await withCacheMutationLock(async () =>
        await syncIndexWithFilesystemUnsafe(reciterId, await readCacheIndex(reciterId))
      );
      await reconcileOfflineReadyFlag(reciterId, syncedIndex);
    })().finally(() => {
      startupMaintenancePromises.delete(reciterId);
    });
    startupMaintenancePromises.set(reciterId, promise);
  }

  await (startupMaintenancePromises.get(reciterId) as Promise<void>);
}

function addConsumerToInflight(inflight: InflightDownload, options: DownloadOptions) {
  inflight.pinnedOfflineRequested ||= options.pinnedOffline;
  if (options.controller) {
    inflight.controllerIds.add(options.controller.id);
  } else {
    inflight.passiveConsumers += 1;
  }
}

function removeConsumerFromInflight(inflight: InflightDownload, options: DownloadOptions) {
  if (options.controller) {
    inflight.controllerIds.delete(options.controller.id);
  } else {
    inflight.passiveConsumers = Math.max(0, inflight.passiveConsumers - 1);
  }
}

function hasConsumers(inflight: InflightDownload) {
  return inflight.controllerIds.size > 0 || inflight.passiveConsumers > 0;
}

async function pauseInflightIfUnused(inflight: InflightDownload) {
  if (hasConsumers(inflight) || !inflight.resumable) {
    return;
  }

  try {
    await inflight.resumable.pauseAsync();
  } catch {
    // Best-effort cancellation.
  }
}

async function getReadyFileUri(
  reciterId: ReciterId,
  fileName: string,
  surahId: number,
  verseNumber: number,
  pinnedOffline: boolean
) {
  const fileUri = getCacheFileUri(reciterId, fileName);
  const result = await withCacheMutationLock(async () => {
    const index = await syncIndexWithFilesystemUnsafe(reciterId, await readCacheIndex(reciterId));
    const entry = index[fileName];
    const existing = await getFileInfo(fileUri);
    if (!existing || !isReadyEntry(entry)) {
      return null;
    }

    await setReadyEntryUnsafe({ reciterId, fileName, surahId, verseNumber, fileUri, pinnedOffline });
    return fileUri;
  });

  if (result) {
    await reconcileOfflineReadyFlag(reciterId);
  }
  return result;
}

async function createInflightDownload(
  surahId: number,
  verseNumber: number,
  options: DownloadOptions
) {
  const { reciterId } = options;
  const fileName = buildVerseFileName(surahId, verseNumber);
  const scopedFileKey = getScopedFileKey(reciterId, fileName);
  const fileUri = getCacheFileUri(reciterId, fileName);
  const partialUri = getPartialFileUri(reciterId, fileName);

  const inflight: InflightDownload = {
    fileName,
    fileUri,
    partialUri,
    promise: Promise.resolve(fileUri),
    resumable: null,
    pinnedOfflineRequested: options.pinnedOffline,
    controllerIds: new Set<string>(),
    passiveConsumers: 0,
  };
  addConsumerToInflight(inflight, options);
  let completed = false;

  const promise = trackTaskPromise((async () => {
    await ensureCacheDir(reciterId);
    await removeFileIfExists(partialUri);
    await withCacheMutationLock(async () => {
      await removeFileIfExists(fileUri);
      await removeIndexEntryUnsafe(reciterId, fileName);
    });
    let lastError: unknown = null;

    for (const baseUrl of getAudioSourceUrls(reciterId)) {
      if (!hasConsumers(inflight)) {
        throw new Error('download_cancelled');
      }

      const resumable = FileSystem.createDownloadResumable(
        buildRemoteVerseAudioUrl(baseUrl, surahId, verseNumber),
        partialUri,
        {}
      );
      inflight.resumable = resumable;

      try {
        const result = await resumable.downloadAsync();
        if (!result || result.status !== 200) {
          throw new Error(`Audio download failed for ${fileName}.`);
        }

        const existingFinal = await getFileInfo(fileUri);
        if (!existingFinal) {
          await removeFileIfExists(fileUri);
          await FileSystem.moveAsync({ from: partialUri, to: fileUri });
        } else {
          await removeFileIfExists(partialUri);
        }

        await withCacheMutationLock(async () => {
          await setReadyEntryUnsafe({
            reciterId,
            fileName,
            surahId,
            verseNumber,
            fileUri,
            pinnedOffline: inflight.pinnedOfflineRequested,
          });
        });
        if (!inflight.pinnedOfflineRequested) {
          await pruneLiveCacheIfNeeded(reciterId);
        }
        await reconcileOfflineReadyFlag(reciterId);
        completed = true;
        return fileUri;
      } catch (error) {
        lastError = error;
        await removeFileIfExists(partialUri);

        const cancelled = error instanceof Error && error.message === 'download_cancelled';
        if (cancelled || !hasConsumers(inflight)) {
          throw new Error('download_cancelled');
        }
      } finally {
        inflight.resumable = null;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Audio download failed for ${fileName}.`);
  })()).catch(async (error) => {
    if (!completed) {
      await withCacheMutationLock(async () => {
        await removeFileIfExists(partialUri);
        await removeFileIfExists(fileUri);
        await removeIndexEntryUnsafe(reciterId, fileName);
      });
      await reconcileOfflineReadyFlag(reciterId);
    }

    throw error;
  }).finally(() => {
    inflightDownloads.delete(scopedFileKey);
  });

  inflight.promise = promise;
  inflightDownloads.set(scopedFileKey, inflight);
  return inflight;
}

async function downloadVerseToCache(
  surahId: number,
  verseNumber: number,
  options: DownloadOptions
): Promise<string> {
  const { pinnedOffline, controller, reciterId } = options;
  const fileName = buildVerseFileName(surahId, verseNumber);
  const scopedFileKey = getScopedFileKey(reciterId, fileName);

  assertNotCancelled(controller);

  const readyFileUri = await getReadyFileUri(reciterId, fileName, surahId, verseNumber, pinnedOffline);
  if (readyFileUri) {
    return readyFileUri;
  }

  let inflight = inflightDownloads.get(scopedFileKey);
  const createdNew = !inflight;
  if (!inflight) {
    inflight = await createInflightDownload(surahId, verseNumber, options);
  } else {
    addConsumerToInflight(inflight, options);
  }

  try {
    const fileUri = await inflight.promise;
    assertNotCancelled(controller);
    return fileUri;
  } finally {
    if (!createdNew) {
      removeConsumerFromInflight(inflight, options);
    }
    if (controller?.cancelled) {
      await pauseInflightIfUnused(inflight);
    }
  }
}

async function cancelController(controller: DownloadJobController | null) {
  if (!controller) {
    return;
  }

  controller.cancelled = true;

  await Promise.allSettled(
    Array.from(inflightDownloads.values()).map(async (inflight) => {
      if (!inflight.controllerIds.has(controller.id)) {
        return;
      }

      inflight.controllerIds.delete(controller.id);
      await pauseInflightIfUnused(inflight);
    })
  );
}

async function cancelAllControllers() {
  const controllers = Array.from(activeControllers);
  await Promise.all(controllers.map((controller) => cancelController(controller)));
}

export async function retainVerseRangeForPlayback(verses: VerseRef[]): Promise<AudioCacheLease> {
  const reciterId = DEFAULT_RECITER_ID;
  const fileNames = verses.map((verse) => buildVerseFileName(verse.surahId, verse.verseNumber));
  for (const fileName of fileNames) {
    registerLease(reciterId, fileName);
  }

  let released = false;
  return {
    release: async () => {
      if (released) {
        return;
      }

      released = true;
      for (const fileName of fileNames) {
        unregisterLease(reciterId, fileName);
      }
    },
  };
}

export async function retainVerseRangeForPlaybackByReciter(reciterId: ReciterId, verses: VerseRef[]): Promise<AudioCacheLease> {
  const fileNames = verses.map((verse) => buildVerseFileName(verse.surahId, verse.verseNumber));
  for (const fileName of fileNames) {
    registerLease(reciterId, fileName);
  }

  let released = false;
  return {
    release: async () => {
      if (released) {
        return;
      }

      released = true;
      for (const fileName of fileNames) {
        unregisterLease(reciterId, fileName);
      }
    },
  };
}

export async function getPreferredVerseAudioUri(
  reciterId: ReciterId,
  surahId: number,
  verseNumber: number
): Promise<string> {
  const { uri } = await getVerseAudioForPlayback(reciterId, surahId, verseNumber);
  return uri;
}

export async function getVerseAudioForPlayback(
  reciterId: ReciterId,
  surahId: number,
  verseNumber: number
): Promise<CachedVerseAudio> {
  const fileName = buildVerseFileName(surahId, verseNumber);
  const fileUri = await getReadyFileUri(reciterId, fileName, surahId, verseNumber, false);
  if (fileUri) {
    return { uri: fileUri, isLocal: true };
  }

  const localUri = await downloadVerseToCache(surahId, verseNumber, { reciterId, pinnedOffline: false });
  return { uri: localUri, isLocal: true };
}

export async function prefetchVerseAudio(
  reciterId: ReciterId,
  surahId: number,
  verseNumber: number,
  pinnedOffline = false,
  controller?: DownloadJobController | null
): Promise<string> {
  return await downloadVerseToCache(surahId, verseNumber, { reciterId, pinnedOffline, controller });
}

export async function prefetchVerseRange(
  reciterId: ReciterId,
  verses: VerseRef[],
  pinnedOffline = false,
  controller?: DownloadJobController | null
) {
  for (const verse of verses) {
    assertNotCancelled(controller);
    await prefetchVerseAudio(reciterId, verse.surahId, verse.verseNumber, pinnedOffline, controller);
  }
}

export async function downloadSurahAudio(
  reciterId: ReciterId,
  surahId: number,
  verseCount: number,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const controller = createController();
  try {
    for (let verseNumber = 1; verseNumber <= verseCount; verseNumber += 1) {
      assertNotCancelled(controller);
      await downloadVerseToCache(surahId, verseNumber, { reciterId, pinnedOffline: true, controller });
      onProgress?.(verseNumber, verseCount);
    }
  } finally {
    releaseController(controller);
  }
}

export async function downloadAudioBundle(
  reciterId: ReciterId,
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<'completed'> {
  if (activeOfflineDownloadPromise) {
    await activeOfflineDownloadPromise;
    return 'completed';
  }

  const verses = listAllVerseRefs();
  const controller = createController();
  activeOfflineReciterId = reciterId;
  activeOfflineController = controller;
  activeOfflineDownloadPromise = trackTaskPromise((async () => {
    const total = verses.length;
    let current = 0;
    activeOfflineProgress = { phase: 'downloading', current, total, percent: 0, reciterId };
    onProgress?.(activeOfflineProgress);

    for (const verse of verses) {
      assertNotCancelled(controller);
      await downloadVerseToCache(verse.surahId, verse.verseNumber, {
        reciterId,
        pinnedOffline: true,
        controller,
      });
      current += 1;
      activeOfflineProgress = {
        phase: 'downloading',
        current,
        total,
        percent: Math.round((current / total) * 100),
        reciterId,
      };
      onProgress?.(activeOfflineProgress);
    }

    const syncedIndex = await withCacheMutationLock(async () =>
      await syncIndexWithFilesystemUnsafe(reciterId, await readCacheIndex(reciterId))
    );
    const completed = Object.keys(syncedIndex).length === total;
    await Storage.setDownloadComplete(reciterId, completed);
  })());

  try {
    await activeOfflineDownloadPromise;
    activeOfflineProgress = {
      phase: 'idle',
      current: verses.length,
      total: verses.length,
      percent: 100,
      reciterId,
    };
    onProgress?.(activeOfflineProgress);
    return 'completed';
  } finally {
    releaseController(controller);
    activeOfflineController = null;
    activeOfflineReciterId = null;
    activeOfflineDownloadPromise = null;
  }
}

export async function resumeAudioBundleDownload(
  reciterId: ReciterId,
  onProgress?: (progress: AudioBundleDownloadProgress) => void
): Promise<'completed'> {
  return await downloadAudioBundle(reciterId, onProgress);
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
    : { phase: 'cancelling', current: 0, total: 0, percent: 0, reciterId: activeOfflineReciterId ?? DEFAULT_RECITER_ID };

  await cancelAllControllers();
  await Promise.allSettled(Array.from(activeTaskPromises));
  activeOfflineProgress = null;
}

export async function clearAllDownloads(reciterId: ReciterId): Promise<void> {
  await cancelAudioBundleDownload();

  const dir = getCacheDir(reciterId);
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }

  activeOfflineProgress = null;
  await clearCacheIndex(reciterId);
  await Storage.setDownloadComplete(reciterId, false);
}

export async function getCachedAudioFileNames(reciterId: ReciterId): Promise<Set<string>> {
  const index = await withCacheMutationLock(async () =>
    await syncIndexWithFilesystemUnsafe(reciterId, await readCacheIndex(reciterId))
  );
  return new Set(Object.keys(index));
}

export async function getCacheStats(reciterId: ReciterId): Promise<{
  bytes: number;
  files: number;
  megabytes: number;
  readyVerses: number;
  totalVerses: number;
  offlineReady: boolean;
}> {
  await ensureCacheDir(reciterId);
  const index = await withCacheMutationLock(async () =>
    await syncIndexWithFilesystemUnsafe(reciterId, await readCacheIndex(reciterId))
  );
  const entries = Object.values(index);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  const totalVerses = getTotalVerseCount();
  const offlineReady = await reconcileOfflineReadyFlag(reciterId, index);

  return {
    bytes: totalBytes,
    files: entries.length,
    megabytes: Number((totalBytes / (1024 * 1024)).toFixed(1)),
    readyVerses: entries.length,
    totalVerses,
    offlineReady,
  };
}

export async function getCacheSize(reciterId: ReciterId): Promise<number> {
  const stats = await getCacheStats(reciterId);
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
