function pad3(num: number): string {
  return String(num).padStart(3, '0');
}

export function buildVerseFileName(surahId: number, verseNumber: number): string {
  return `${pad3(surahId)}${pad3(verseNumber)}.mp3`;
}

export function formatProgress(current: number, total: number): string {
  return `${current}/${total}`;
}
