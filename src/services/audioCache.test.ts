import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildVerseFileName } from '../utils/formatters';

const DEFAULT_RECITER_ID = 'ghamdi';
const SECOND_RECITER_ID = 'mishary';
const THIRD_RECITER_ID = 'maher';
const FOURTH_RECITER_ID = 'minshawy';

type FileRecord = {
  size: number;
  isDirectory?: boolean;
};

const documentDirectory = 'file:///mock-docs/';
const files = new Map<string, FileRecord>();
const storage = new Map<string, string>();
const downloadCounts = new Map<string, number>();
const downloadHandlers = new Map<string, () => Promise<{ status: number }>>();
let diagnosticLog = '';

function setFile(uri: string, size: number, isDirectory = false) {
  files.set(uri, { size, isDirectory });
}

function getParentDir(uri: string) {
  const index = uri.lastIndexOf('/');
  return index >= 0 ? uri.slice(0, index + 1) : uri;
}

function listDirectory(uri: string) {
  const prefix = uri.endsWith('/') ? uri : `${uri}/`;
  const names = new Set<string>();
  for (const key of files.keys()) {
    if (!key.startsWith(prefix) || key === prefix) {
      continue;
    }

    const remainder = key.slice(prefix.length);
    const name = remainder.split('/')[0];
    if (name) {
      names.add(name);
    }
  }

  return Array.from(names);
}

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory,
  cacheDirectory: null,
  async getInfoAsync(uri: string) {
    const entry = files.get(uri);
    if (!entry) {
      return { exists: false, isDirectory: false, size: 0 };
    }

    return {
      exists: true,
      isDirectory: Boolean(entry.isDirectory),
      size: entry.size,
    };
  },
  async makeDirectoryAsync(uri: string) {
    setFile(uri, 0, true);
  },
  async deleteAsync(uri: string) {
    const prefix = uri.endsWith('/') ? uri : `${uri}/`;
    files.delete(uri);
    for (const key of Array.from(files.keys())) {
      if (key.startsWith(prefix)) {
        files.delete(key);
      }
    }
  },
  async readDirectoryAsync(uri: string) {
    return listDirectory(uri);
  },
  async moveAsync({ from, to }: { from: string; to: string }) {
    const source = files.get(from);
    if (!source) {
      throw new Error(`Missing source file: ${from}`);
    }

    files.delete(from);
    setFile(to, source.size, false);
  },
  async getFreeDiskStorageAsync() {
    return 2 * 1024 * 1024 * 1024;
  },
  createDownloadResumable(url: string, destination: string) {
    const handler = downloadHandlers.get(url);
    if (!handler) {
      throw new Error(`Missing download handler for ${url}`);
    }

    return {
      async downloadAsync() {
        downloadCounts.set(url, (downloadCounts.get(url) ?? 0) + 1);
        setFile(destination, 128, false);
        return await handler();
      },
      async pauseAsync() {
        return undefined;
      },
    };
  },
}));

vi.mock('./storage', () => ({
  Storage: {
    async setItem(key: string, value: string) {
      storage.set(key, value);
    },
    async getItem(key: string) {
      return storage.get(key) ?? null;
    },
    async removeItem(key: string) {
      storage.delete(key);
    },
    async setDownloadComplete(reciterId: string, complete: boolean) {
      storage.set(`@app_full_download_complete:${reciterId}`, complete ? '1' : '0');
    },
    async getDownloadComplete(reciterId: string) {
      return storage.get(`@app_full_download_complete:${reciterId}`) === '1';
    },
  },
}));

vi.mock('./audioDiagnostics', () => ({
  async appendAudioDiagnosticLog(step: string) {
    diagnosticLog = diagnosticLog ? `${diagnosticLog}\n${step}` : step;
  },
  async getAudioDiagnosticLog() {
    return diagnosticLog;
  },
  async clearAudioDiagnosticLog() {
    diagnosticLog = '';
  },
}));

async function loadAudioCache() {
  vi.resetModules();
  return await import('./audioCache');
}

beforeEach(() => {
  files.clear();
  storage.clear();
  downloadCounts.clear();
  downloadHandlers.clear();
  diagnosticLog = '';
  setFile(documentDirectory, 0, true);
  setFile(`${documentDirectory}ayah-audio-cache/`, 0, true);
  setFile(`${documentDirectory}ayah-audio-cache/ghamdi/`, 0, true);
  setFile(`${documentDirectory}ayah-audio-cache/mishary/`, 0, true);
  setFile(`${documentDirectory}ayah-audio-cache/maher/`, 0, true);
  setFile(`${documentDirectory}ayah-audio-cache/minshawy/`, 0, true);
});

describe('audioCache', () => {
  it('shares a single transfer between offline download and playback', async () => {
    const audioCache = await loadAudioCache();
    const url = 'https://everyayah.com/data/Ghamadi_40kbps/001001.mp3';
    downloadHandlers.set(url, async () => ({ status: 200 }));

    const [offlineUri, playback] = await Promise.all([
      audioCache.downloadSurahAudio(DEFAULT_RECITER_ID, 1, 1),
      audioCache.getVerseAudioForPlayback(DEFAULT_RECITER_ID, 1, 1),
    ]);

    expect(offlineUri).toBeUndefined();
    expect(playback.uri).toContain(buildVerseFileName(1, 1));
    expect(downloadCounts.get(url)).toBe(1);

    const stats = await audioCache.getCacheStats(DEFAULT_RECITER_ID);
    expect(stats.readyVerses).toBe(1);
  });

  it('does not delete active partial files while reading cache stats', async () => {
    const audioCache = await loadAudioCache();
    const url = 'https://everyayah.com/data/Ghamadi_40kbps/001001.mp3';
    let resolveDownload: (value: { status: number }) => void = () => undefined;
    downloadHandlers.set(url, async () => await new Promise<{ status: number }>((resolve) => {
      resolveDownload = resolve;
    }));

    const pendingDownload = audioCache.prefetchVerseAudio(DEFAULT_RECITER_ID, 1, 1, true);

    const partialUri = `${documentDirectory}ayah-audio-cache/ghamdi/${buildVerseFileName(1, 1)}.part`;
    await vi.waitFor(() => {
      expect(files.has(partialUri)).toBe(true);
    });

    const stats = await audioCache.getCacheStats(DEFAULT_RECITER_ID);
    expect(stats.readyVerses).toBe(0);
    expect(files.has(partialUri)).toBe(true);

    resolveDownload({ status: 200 });
    await pendingDownload;
    expect(files.has(`${documentDirectory}ayah-audio-cache/ghamdi/${buildVerseFileName(1, 1)}`)).toBe(true);
  });

  it('repairs a stale offline-ready flag when the cache is incomplete', async () => {
    const audioCache = await loadAudioCache();
    storage.set('@app_full_download_complete:ghamdi', '1');

    const stats = await audioCache.getCacheStats(DEFAULT_RECITER_ID);

    expect(stats.offlineReady).toBe(false);
    expect(storage.get('@app_full_download_complete:ghamdi')).toBe('0');
  });

  it('keeps leased files out of live cache pruning', async () => {
    const audioCache = await loadAudioCache();
    const cacheDir = `${documentDirectory}ayah-audio-cache/ghamdi/`;
    const leasedFile = buildVerseFileName(1, 1);
    const removableFile = buildVerseFileName(1, 2);

    setFile(`${cacheDir}${leasedFile}`, 150 * 1024 * 1024);
    setFile(`${cacheDir}${removableFile}`, 150 * 1024 * 1024);
    storage.set('@app_ayah_audio_cache_index_v3:ghamdi', JSON.stringify({
      [leasedFile]: {
        fileName: leasedFile,
        surahId: 1,
        verseNumber: 1,
        sizeBytes: 150 * 1024 * 1024,
        lastAccessedAt: 1,
        pinnedOffline: false,
        status: 'ready',
      },
      [removableFile]: {
        fileName: removableFile,
        surahId: 1,
        verseNumber: 2,
        sizeBytes: 150 * 1024 * 1024,
        lastAccessedAt: 2,
        pinnedOffline: false,
        status: 'ready',
      },
    }));

    const lease = await audioCache.retainVerseRangeForPlaybackByReciter(DEFAULT_RECITER_ID, [{ surahId: 1, verseNumber: 1 }]);
    const nextUrl = 'https://everyayah.com/data/Ghamadi_40kbps/001003.mp3';
    downloadHandlers.set(nextUrl, async () => ({ status: 200 }));

    await audioCache.prefetchVerseAudio(DEFAULT_RECITER_ID, 1, 3, false);

    expect(files.has(`${cacheDir}${leasedFile}`)).toBe(true);
    expect(files.has(`${cacheDir}${removableFile}`)).toBe(false);

    await lease.release();
  });

  it('stores different reciters in separate cache directories', async () => {
    const audioCache = await loadAudioCache();
    const ghamdiUrl = 'https://everyayah.com/data/Ghamadi_40kbps/001001.mp3';
    const misharyUrl = 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3';
    const maherUrl = 'https://everyayah.com/data/MaherAlMuaiqly128kbps/001001.mp3';
    const minshawyUrl = 'https://everyayah.com/data/Minshawy_Murattal_128kbps/001001.mp3';
    downloadHandlers.set(ghamdiUrl, async () => ({ status: 200 }));
    downloadHandlers.set(misharyUrl, async () => ({ status: 200 }));
    downloadHandlers.set(maherUrl, async () => ({ status: 200 }));
    downloadHandlers.set(minshawyUrl, async () => ({ status: 200 }));

    const ghamdiPlayback = await audioCache.getVerseAudioForPlayback(DEFAULT_RECITER_ID, 1, 1);
    const misharyPlayback = await audioCache.getVerseAudioForPlayback(SECOND_RECITER_ID, 1, 1);
    const maherPlayback = await audioCache.getVerseAudioForPlayback(THIRD_RECITER_ID, 1, 1);
    const minshawyPlayback = await audioCache.getVerseAudioForPlayback(FOURTH_RECITER_ID, 1, 1);

    expect(ghamdiPlayback.uri).toContain('/ghamdi/');
    expect(misharyPlayback.uri).toContain('/mishary/');
    expect(maherPlayback.uri).toContain('/maher/');
    expect(minshawyPlayback.uri).toContain('/minshawy/');
    expect(downloadCounts.get(ghamdiUrl)).toBe(1);
    expect(downloadCounts.get(misharyUrl)).toBe(1);
    expect(downloadCounts.get(maherUrl)).toBe(1);
    expect(downloadCounts.get(minshawyUrl)).toBe(1);
  });

  it('records cache miss then cache hit in diagnostics', async () => {
    const audioCache = await loadAudioCache();
    const diagnostics = await import('./audioDiagnostics');
    const url = 'https://everyayah.com/data/Ghamadi_40kbps/001001.mp3';
    downloadHandlers.set(url, async () => ({ status: 200 }));

    await diagnostics.clearAudioDiagnosticLog();
    await audioCache.getVerseAudioForPlayback(DEFAULT_RECITER_ID, 1, 1);
    await audioCache.getVerseAudioForPlayback(DEFAULT_RECITER_ID, 1, 1);

    const log = await diagnostics.getAudioDiagnosticLog();
    expect(log).toContain('cache_miss');
    expect(log).toContain('cache_hit');
  });
});
