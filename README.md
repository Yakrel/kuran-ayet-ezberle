# Kur'an - Ayet Ezberle

Android-first Quran memorization app built with Expo + React Native.

## MVP Features

- Surah picker
- Ayah range playback (start ayah + count + repeat)
- Arabic ayah text display
- Translation display with configurable meal source
- Default TR meal: **Ali Bulaç** (`author=6`)
- Default EN meal: **Sahih International** (`author=32`)
- Saad Al-Ghamdi verse-by-verse audio playback
- Stream-first audio with local per-ayah caching
- Swipe left/right page navigation in verse area

## Setup

```bash
npm install
npm run start
```

## Development

Preferred day-to-day flow for Android development is Development Build + Metro over LAN.

Start the dev server on the fixed Metro port `19000`:

```bash
npm run start:lan
```

Open from your phone with your development build:

- `exp://<LOCAL_IP>:19000`
- `http://<LOCAL_IP>:19000/_expo/loading`

If Metro gets stuck on reloading, or after adding/changing fonts and dependencies, restart with a clean cache:

```bash
npx expo start --dev-client --lan --port 19000 --clear
```

Notes:

- For JS, styling, copy, and Expo font changes, a rebuild is not required.
- Rebuild only when adding/changing native modules, Expo plugins, or native app config.

Run on Android:

```bash
npm run android
```

Remote Android testing over LAN (recommended):

```bash
npm run start:lan
```

If you need to rebuild the native shell, use the development client flow:

```bash
npm run build:dev-client
npm run start:dev-client
```

Install the generated Dev Client APK on your phone, then connect to the running dev server for hot reload.

Run on iOS:

```bash
npm run ios
```

## Data Sources

- Text + translation API: `https://api.acikkuran.com`
  - Surah list: `/surahs`
  - Surah detail + translation: `/surah/{id}?author={authorId}`
- Audio (Saad Al-Ghamdi, verse-based): `https://everyayah.com/data/Ghamadi_40kbps/{sss}{aaa}.mp3`

## Audio Backup

The runtime source remains EveryAyah by default. An optional mirror URL can be injected with:

```bash
EXPO_PUBLIC_AUDIO_MIRROR_URL=https://your-cdn.example.com/Ghamadi_40kbps
```

To create a local backup archive of the current verse-by-verse MP3 set without changing the runtime source:

```bash
npm run backup:audio
```

This writes the mirror files and archive under `audio-backups/`, which is intentionally gitignored.

## License

This project is licensed under `GPL-3.0-or-later`.

Copyright (C) 2025 Berkay Yetgin

See `LICENSE` for details.

## Attribution Notes

- AçıkKuran API licensing (CC BY-NC-SA) is documented by the provider.
- EveryAyah / VerseByVerseQuran may require attribution/backlink for distribution use.
  Verify current attribution requirements before publishing.
