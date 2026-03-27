#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const quranData = require('../assets/data/quran.json');

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'audio-backups');
const MIRROR_DIR = path.join(OUTPUT_DIR, 'mirror', 'Ghamadi_40kbps');
const ARCHIVE_DIR = path.join(OUTPUT_DIR, 'archives');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const BASE_URL = process.env.AUDIO_BACKUP_BASE_URL?.trim() || 'https://everyayah.com/data/Ghamadi_40kbps';
const RETRY_DELAYS = [0, 500, 1500];

function pad3(value) {
  return String(value).padStart(3, '0');
}

function buildVerseFileName(surahId, verseNumber) {
  return `${pad3(surahId)}${pad3(verseNumber)}.mp3`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadFile(url, destinationPath) {
  for (const delay of RETRY_DELAYS) {
    if (delay > 0) {
      await sleep(delay);
    }

    try {
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destinationPath);
        const request = https.get(url, (response) => {
          if (response.statusCode !== 200) {
            file.close();
            fs.rmSync(destinationPath, { force: true });
            reject(new Error(`Unexpected status ${response.statusCode} for ${url}`));
            return;
          }

          response.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        });

        request.on('error', (error) => {
          file.close();
          fs.rmSync(destinationPath, { force: true });
          reject(error);
        });

        request.setTimeout(30000, () => {
          request.destroy(new Error(`Timed out while downloading ${url}`));
        });
      });

      return;
    } catch (error) {
      if (delay === RETRY_DELAYS[RETRY_DELAYS.length - 1]) {
        throw error;
      }
    }
  }
}

function createArchive() {
  ensureDir(ARCHIVE_DIR);

  const zipBinary = spawnSync('sh', ['-lc', 'command -v zip'], { encoding: 'utf8' }).stdout.trim();
  if (zipBinary) {
    const archivePath = path.join(ARCHIVE_DIR, 'Ghamadi_40kbps.zip');
    const result = spawnSync(zipBinary, ['-rq', archivePath, 'Ghamadi_40kbps'], {
      cwd: path.join(OUTPUT_DIR, 'mirror'),
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      throw new Error('Failed to create zip archive.');
    }

    return archivePath;
  }

  const archivePath = path.join(ARCHIVE_DIR, 'Ghamadi_40kbps.tar.gz');
  const result = spawnSync('tar', ['-czf', archivePath, 'Ghamadi_40kbps'], {
    cwd: path.join(OUTPUT_DIR, 'mirror'),
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('Failed to create tar.gz archive.');
  }

  return archivePath;
}

async function main() {
  ensureDir(MIRROR_DIR);
  ensureDir(ARCHIVE_DIR);

  const verses = [];
  for (const surah of quranData.surahs) {
    for (let verseNumber = 1; verseNumber <= surah.verse_count; verseNumber += 1) {
      verses.push({
        surahId: surah.id,
        verseNumber,
        fileName: buildVerseFileName(surah.id, verseNumber),
      });
    }
  }

  console.log(`Preparing backup for ${verses.length} audio files from ${BASE_URL}`);

  let completed = 0;
  for (const verse of verses) {
    const destinationPath = path.join(MIRROR_DIR, verse.fileName);
    if (!fs.existsSync(destinationPath)) {
      await downloadFile(`${BASE_URL}/${verse.fileName}`, destinationPath);
    }

    completed += 1;
    if (completed % 100 === 0 || completed === verses.length) {
      console.log(`Downloaded ${completed}/${verses.length}`);
    }
  }

  const archivePath = createArchive();
  const stats = fs.statSync(archivePath);
  const manifest = {
    source: BASE_URL,
    fileCount: verses.length,
    generatedAt: new Date().toISOString(),
    archivePath: path.relative(ROOT_DIR, archivePath),
    archiveSizeBytes: stats.size,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Backup archive created at ${manifest.archivePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
