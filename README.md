# Kur'an - Ayet Ezberle

A concise, open-source Android-first Quran memorization app built with Expo and React Native.

## Features

- Surah and ayah selector
- Play a range of ayahs (start, count) with optional repeat/loop
- Arabic ayah text display alongside selectable translations (TR/EN)
- Verse-by-verse audio streaming (Saad Al-Ghamdi) with local per-ayah caching for faster replay
- Page-based swipe navigation and resume playback
- Lightweight, stream-first design to minimize storage while allowing repeated listening

## Quick start

Install dependencies and start the dev server:

```bash
npm install
npm run start
```

Run on Android (development):

```bash
npm run android
```

Use `npm run start:lan` or `npx expo start --dev-client --lan --port 19000` for device testing over LAN.

## Data sources

- Text & translations: https://api.acikkuran.com
- Audio (Saad Al-Ghamdi): https://everyayah.com/data/Ghamadi_40kbps/{sss}{aaa}.mp3

## License

GPL-3.0-or-later — see LICENSE for details.

---

