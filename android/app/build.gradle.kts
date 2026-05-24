plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.berkayyetgin.kuranayetezberle"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.berkayyetgin.kuranayetezberle"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        create("release") {
            val releaseStoreFile = providers.gradleProperty("android.signing.storeFile")
                .orElse(providers.environmentVariable("ANDROID_SIGNING_STORE_FILE"))
                .orNull
            val releaseStorePassword = providers.gradleProperty("android.signing.storePassword")
                .orElse(providers.environmentVariable("ANDROID_SIGNING_STORE_PASSWORD"))
                .orNull
            val releaseKeyAlias = providers.gradleProperty("android.signing.keyAlias")
                .orElse(providers.environmentVariable("ANDROID_SIGNING_KEY_ALIAS"))
                .orNull
            val releaseKeyPassword = providers.gradleProperty("android.signing.keyPassword")
                .orElse(providers.environmentVariable("ANDROID_SIGNING_KEY_PASSWORD"))
                .orNull

            if (!releaseStoreFile.isNullOrBlank()) storeFile = file(releaseStoreFile)
            if (!releaseStorePassword.isNullOrBlank()) storePassword = releaseStorePassword
            if (!releaseKeyAlias.isNullOrBlank()) keyAlias = releaseKeyAlias
            if (!releaseKeyPassword.isNullOrBlank()) keyPassword = releaseKeyPassword
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

kapt {
    arguments {
        arg("room.schemaLocation", "$projectDir/schemas")
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.room.ktx)
    implementation(libs.androidx.room.runtime)
    kapt(libs.androidx.room.compiler)

    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)
    kapt(libs.androidx.hilt.compiler)

    implementation(libs.media3.exoplayer)
    implementation(libs.media3.session)
    implementation(libs.media3.ui)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.okhttp)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}
