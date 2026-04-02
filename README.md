# Kur'an - Ayet Ezberle

A concise, open-source Android-first Quran memorization app built with Expo and React Native.

## Features

- Surah and ayah selector
- Play a range of ayahs (start, count) with optional repeat/loop
- Arabic ayah text display alongside selectable translations (TR/EN)
- Verse-by-verse audio playback (Saad Al-Ghamdi) with automatic per-ayah disk caching
- Page-based swipe navigation and resume playback
- Stream-first listening with a reusable offline pack built on the same ayah cache

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
- Audio (Saad Al-Ghamdi): https://everyayah.com/data/Ghamadi_40kbps/
  Ayah files follow the pattern `SSSAAA.mp3` where `SSS` is the 3-digit surah and `AAA` is the 3-digit ayah.
  Example: https://everyayah.com/data/Ghamadi_40kbps/001001.mp3

## License

GPL-3.0-or-later — see LICENSE for details.

---
