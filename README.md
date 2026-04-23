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

Install dependencies and start the Android dev-client server:

```bash
npm install
npm run start
```

Create the Android development build once:

```bash
npm run build:dev-client
```

After installing that build on the device, use Metro-driven development:

```bash
npm run start
```

`npm run start` now launches Expo in dev-client mode over LAN, so JavaScript/UI changes refresh in the installed development build without rebuilding the APK each time.

If you need a plain Metro server without dev-client flags, use:

```bash
npm run start:metro
```

## Data sources

- Text & translations: https://api.acikkuran.com
- Audio and ayah timing: QUL/Tarteel recitation `13` for Saad Al-Ghamdi.
- The app uses embedded full-surah MP3 references and timing data from `assets/data/recitations/qul-recitation-13.json`.
- Offline listening caches the same full-surah MP3 files under the app cache; it does not use a separate verse-by-verse audio source.

## License

GPL-3.0-or-later — see LICENSE for details.

---
