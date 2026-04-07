const fs = require("fs/promises");
const path = require("path");
const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");

const APPLY_RELEASE_SIGNING_GRADLE = `apply from: "./release-signing.gradle"`;

const RELEASE_SIGNING_GRADLE = `def releaseStoreFile = findProperty('android.signing.storeFile') ?: System.getenv('ANDROID_SIGNING_STORE_FILE')
def releaseStorePassword = findProperty('android.signing.storePassword') ?: System.getenv('ANDROID_SIGNING_STORE_PASSWORD')
def releaseKeyAlias = findProperty('android.signing.keyAlias') ?: System.getenv('ANDROID_SIGNING_KEY_ALIAS')
def releaseKeyPassword = findProperty('android.signing.keyPassword') ?: System.getenv('ANDROID_SIGNING_KEY_PASSWORD')
def hasReleaseSigning = [
    releaseStoreFile,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
].every { value -> value != null && value.toString().trim() }

def isReleaseTaskRequested = gradle.startParameter.taskNames.any { taskName ->
    taskName.toLowerCase().contains("release")
}

if (isReleaseTaskRequested && !hasReleaseSigning) {
    throw new GradleException(
        "Release signing is required for production APK builds. " +
        "Set ANDROID_SIGNING_STORE_FILE, ANDROID_SIGNING_STORE_PASSWORD, " +
        "ANDROID_SIGNING_KEY_ALIAS, and ANDROID_SIGNING_KEY_PASSWORD."
    )
}

if (hasReleaseSigning) {
    def releaseSigningConfig = android.signingConfigs.findByName("release") ?: android.signingConfigs.create("release")

    releaseSigningConfig.storeFile = file(releaseStoreFile)
    releaseSigningConfig.storePassword = releaseStorePassword
    releaseSigningConfig.keyAlias = releaseKeyAlias
    releaseSigningConfig.keyPassword = releaseKeyPassword

    android.buildTypes.release.signingConfig = releaseSigningConfig
}
`;

function withReleaseSigningGradleFile(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const releaseSigningGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "release-signing.gradle"
      );

      await fs.writeFile(releaseSigningGradlePath, RELEASE_SIGNING_GRADLE);
      return config;
    },
  ]);
}

function withReleaseSigningGradleApply(config) {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;

    if (modResults.language !== "groovy") {
      throw new Error("Android release signing plugin only supports Groovy app/build.gradle files.");
    }

    const normalizedLines = modResults.contents.replace(/\r\n/g, "\n").split("\n");
    const alreadyApplied = normalizedLines.some(
      (line) =>
        line.trim() === APPLY_RELEASE_SIGNING_GRADLE ||
        line.trim() === APPLY_RELEASE_SIGNING_GRADLE.replace(/"/g, "'")
    );

    if (!alreadyApplied) {
      modResults.contents = `${modResults.contents.trim()}\n${APPLY_RELEASE_SIGNING_GRADLE}\n`;
    }

    return config;
  });
}

module.exports = function withAndroidReleaseSigning(config) {
  config = withReleaseSigningGradleFile(config);
  return withReleaseSigningGradleApply(config);
};
