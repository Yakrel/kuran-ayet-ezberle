const { withAppBuildGradle } = require("expo/config-plugins");

const RELEASE_SIGNING_BLOCK = `def releaseStoreFile = findProperty('android.signing.storeFile') ?: System.getenv('ANDROID_SIGNING_STORE_FILE')
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
    def normalizedTaskName = taskName.toLowerCase()
    normalizedTaskName.contains("release")
}

if (isReleaseTaskRequested && !hasReleaseSigning) {
    throw new GradleException(
        "Release signing is required for production APK builds. " +
        "Set ANDROID_SIGNING_STORE_FILE, ANDROID_SIGNING_STORE_PASSWORD, " +
        "ANDROID_SIGNING_KEY_ALIAS, and ANDROID_SIGNING_KEY_PASSWORD."
    )
}`;

const SIGNING_CONFIGS_NEEDLE = `def releaseStoreFile = findProperty('android.signing.storeFile') ?: System.getenv('ANDROID_SIGNING_STORE_FILE')
def releaseStorePassword = findProperty('android.signing.storePassword') ?: System.getenv('ANDROID_SIGNING_STORE_PASSWORD')
def releaseKeyAlias = findProperty('android.signing.keyAlias') ?: System.getenv('ANDROID_SIGNING_KEY_ALIAS')
def releaseKeyPassword = findProperty('android.signing.keyPassword') ?: System.getenv('ANDROID_SIGNING_KEY_PASSWORD')
def hasReleaseSigning = [
    releaseStoreFile,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
].every { value -> value != null && value.toString().trim() }`;

const RELEASE_BLOCK_NEEDLE = `        release {
            // Fall back to unsigned release artifacts when no production keystore is configured.
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.release
            }`;

const RELEASE_BLOCK_REPLACEMENT = `        release {
            signingConfig = signingConfigs.release`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let { contents } = config.modResults;

    if (!contents.includes(SIGNING_CONFIGS_NEEDLE)) {
      throw new Error("Could not find Android signing block in app/build.gradle.");
    }

    contents = contents.replace(SIGNING_CONFIGS_NEEDLE, RELEASE_SIGNING_BLOCK);

    if (!contents.includes(RELEASE_BLOCK_NEEDLE)) {
      throw new Error("Could not find Android release block in app/build.gradle.");
    }

    contents = contents.replace(RELEASE_BLOCK_NEEDLE, RELEASE_BLOCK_REPLACEMENT);
    config.modResults.contents = contents;
    return config;
  });
};
