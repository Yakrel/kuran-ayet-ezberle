# Android Device Testing Workflow

This repo must not run local Android builds. Use CI artifacts plus ADB for device testing.

## One-time setup

1. Install or download Android platform-tools.
   - In this workspace the temporary ADB path is `/tmp/platform-tools/adb`.
2. On the phone, enable Developer options.
3. Enable `Wireless debugging`.
4. Pair once from the phone's `Pair device with pairing code` screen:

```sh
/tmp/platform-tools/adb pair PHONE_IP:PAIRING_PORT PAIRING_CODE
```

Example shape:

```sh
/tmp/platform-tools/adb pair 192.168.1.233:38895 123456
```

Do not store real pairing codes in the repo.

## Reconnect for a test session

Wireless debugging shows a separate `IP address & Port` on its main screen. Use that port for connect:

```sh
/tmp/platform-tools/adb connect PHONE_IP:CONNECT_PORT
/tmp/platform-tools/adb devices -l
```

The pairing usually persists until the phone forgets the paired computer, wireless debugging is reset, or ADB host keys are removed. The connect port can change after toggling wireless debugging, rebooting, or reconnecting Wi-Fi.

Recommended network setup:

- Reserve the phone's IP in the router DHCP settings, for example `192.168.1.233`.
- Keep phone and server/container on the same LAN.
- If the phone IP changes, read the new IP from Wireless debugging and reconnect.

## Trigger CI APK build

The workflow builds APK artifacts for `push` to `main` or manual `workflow_dispatch`.

For a branch test build:

```sh
gh workflow run mobile-builds.yml --ref BRANCH_NAME
gh run watch RUN_ID --exit-status
```

The workflow uploads:

- `android-development-apk`
- `android-production-apk`

For testing the installed release app, prefer `android-production-apk` so the signing certificate matches the existing production install.

## Download and install APK

```sh
mkdir -p /tmp/kuran-apk
gh run download RUN_ID -n android-production-apk -D /tmp/kuran-apk
unzip -o /tmp/kuran-apk/*.zip -d /tmp/kuran-apk
/tmp/platform-tools/adb install -r /tmp/kuran-apk/*.apk
```

If Android rejects a lower version code during branch testing:

```sh
/tmp/platform-tools/adb install -r -d /tmp/kuran-apk/*.apk
```

If Android rejects due to a signing mismatch, uninstall is required and app data will be lost:

```sh
/tmp/platform-tools/adb uninstall com.berkayyetgin.kuranayetezberle
/tmp/platform-tools/adb install /tmp/kuran-apk/*.apk
```

## Launch and capture logs

Launch the app:

```sh
/tmp/platform-tools/adb shell monkey -p com.berkayyetgin.kuranayetezberle 1
```

Clear logs before reproducing a bug:

```sh
/tmp/platform-tools/adb logcat -c
```

Focused crash log stream:

```sh
/tmp/platform-tools/adb logcat -v time \
  AndroidRuntime:E ReactNativeJS:E ReactNative:E TrackPlayer:D ExoPlayer:D \
  MediaSessionService:D ActivityManager:I DEBUG:E '*:S'
```

Useful things to look for:

- `AndroidRuntime` and `FATAL EXCEPTION` for crashes.
- `ReactNativeJS` for JavaScript exceptions.
- `MediaSessionService`, `TrackPlayer`, and `ExoPlayer` for playback state changes.
- `Process com.berkayyetgin.kuranayetezberle has died` for process death.

## Common ADB actions

Check whether the app is running:

```sh
/tmp/platform-tools/adb shell pidof com.berkayyetgin.kuranayetezberle
```

Stop the app:

```sh
/tmp/platform-tools/adb shell am force-stop com.berkayyetgin.kuranayetezberle
```

Clear app data:

```sh
/tmp/platform-tools/adb shell pm clear com.berkayyetgin.kuranayetezberle
```

List installed package info:

```sh
/tmp/platform-tools/adb shell dumpsys package com.berkayyetgin.kuranayetezberle
```
