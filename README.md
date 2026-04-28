# Quran Ayah Memorization

A concise, open-source Android-first Quran memorization app built with Expo and React Native.

## Features

- Surah and ayah selector
- Play an explicit ayah range (start, end) with optional repeat/loop
- Arabic ayah text display alongside selectable translations (TR/EN)
- Continuous full-surah audio playback (Saad Al-Ghamdi) with ayah timing and range seeking
- Page-based swipe navigation and resume playback
- Stream-first listening with a reusable offline pack built on the same full-surah audio source

## Quick start

Install dependencies:

```bash
npm install
```

Create the Android production APK with EAS:

```bash
npm run build:android:production
```

Start Metro only when you explicitly need a local JS server:

```bash
npm run start
```

Android production builds produce an APK. iOS builds are intentionally not configured because iOS does not support APK-style manual installation without Apple Developer Program signing.

## Data sources

- Quran text: Uthmani text via Quran.com/Quran.Foundation content API.
- Translations and Turkish transcription: https://api.acikkuran.com
- Audio and ayah timing: QUL/Tarteel recitation `13` for Saad Al-Ghamdi.
- The app uses embedded full-surah MP3 references and timing data from `assets/data/recitations/qul-recitation-13.json`.
- Offline listening caches the same full-surah MP3 files under the app cache; it does not use a separate verse-by-verse audio source.

## License

GPL-3.0-or-later — see LICENSE for details.

---
