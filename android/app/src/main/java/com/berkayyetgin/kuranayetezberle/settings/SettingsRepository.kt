package com.berkayyetgin.kuranayetezberle.settings

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.berkayyetgin.kuranayetezberle.data.ReciterCatalog
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("settings")

data class AppSettings(
    val translationAuthorId: String = "6",
    val reciterId: Int = ReciterCatalog.DEFAULT_RECITER_ID,
    val showTranscription: Boolean = false,
    val darkTheme: Boolean? = null,
    val playbackSpeed: Float = 1f,
    val repeatCount: Int = 20,
    val arabicTextSizeSp: Float = 30f,
    val showDownloadPrompt: Boolean = true,
    val autoDownload: Boolean = false,
    val lastSurahId: Int = 1,
    val lastStartAyah: Int = 1,
    val lastEndAyah: Int = 7,
    val lastActiveAyah: Int? = null,
)

class SettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val settings: Flow<AppSettings> = context.dataStore.data.map { preferences ->
        val startAyah = (preferences[Keys.lastStartAyah] ?: 1).coerceAtLeast(1)
        AppSettings(
            translationAuthorId = (preferences[Keys.translationAuthorId] ?: "6")
                .takeIf { it in SUPPORTED_TRANSLATION_IDS } ?: "6",
            reciterId = ReciterCatalog.byId(
                preferences[Keys.reciterId] ?: ReciterCatalog.DEFAULT_RECITER_ID,
            ).id,
            showTranscription = preferences[Keys.showTranscription] ?: false,
            darkTheme = preferences[Keys.darkTheme],
            playbackSpeed = (preferences[Keys.playbackSpeed] ?: 1f).coerceIn(0.5f, 2f),
            repeatCount = (preferences[Keys.repeatCount] ?: 20).coerceIn(1, 999),
            arabicTextSizeSp = (preferences[Keys.arabicTextSizeSp] ?: 30f).coerceIn(24f, 38f),
            showDownloadPrompt = preferences[Keys.showDownloadPrompt] ?: true,
            autoDownload = preferences[Keys.autoDownload] ?: false,
            lastSurahId = (preferences[Keys.lastSurahId] ?: 1).coerceIn(1, 114),
            lastStartAyah = startAyah,
            lastEndAyah = (preferences[Keys.lastEndAyah] ?: 7).coerceAtLeast(startAyah),
            lastActiveAyah = preferences[Keys.lastActiveAyah]?.takeIf { it >= 1 },
        )
    }

    suspend fun saveLastSession(surahId: Int, startAyah: Int, endAyah: Int, activeAyah: Int?) = context.dataStore.edit {
        it[Keys.lastSurahId] = surahId
        it[Keys.lastStartAyah] = startAyah
        it[Keys.lastEndAyah] = endAyah
        if (activeAyah != null) {
            it[Keys.lastActiveAyah] = activeAyah
        } else {
            it.remove(Keys.lastActiveAyah)
        }
    }

    suspend fun setRepeatCount(value: Int) = context.dataStore.edit { it[Keys.repeatCount] = value }
    suspend fun setPlaybackSpeed(value: Float) = context.dataStore.edit { it[Keys.playbackSpeed] = value }
    suspend fun setTranslationAuthor(value: String) = context.dataStore.edit { it[Keys.translationAuthorId] = value }
    suspend fun setReciter(value: Int) = context.dataStore.edit { it[Keys.reciterId] = value }
    suspend fun setShowTranscription(value: Boolean) = context.dataStore.edit { it[Keys.showTranscription] = value }
    suspend fun setDarkTheme(value: Boolean) = context.dataStore.edit { it[Keys.darkTheme] = value }
    suspend fun setArabicTextSizeSp(value: Float) = context.dataStore.edit { it[Keys.arabicTextSizeSp] = value }
    suspend fun setShowDownloadPrompt(value: Boolean) = context.dataStore.edit { it[Keys.showDownloadPrompt] = value }
    suspend fun setAutoDownload(value: Boolean) = context.dataStore.edit { it[Keys.autoDownload] = value }

    private companion object {
        val SUPPORTED_TRANSLATION_IDS = setOf("6", "32")
    }

    private object Keys {
        val translationAuthorId = stringPreferencesKey("translation_author_id")
        val reciterId = intPreferencesKey("reciter_id")
        val showTranscription = booleanPreferencesKey("show_transcription")
        val darkTheme = booleanPreferencesKey("dark_theme")
        val playbackSpeed = floatPreferencesKey("playback_speed")
        val repeatCount = intPreferencesKey("repeat_count")
        val arabicTextSizeSp = floatPreferencesKey("arabic_text_size_sp")
        val showDownloadPrompt = booleanPreferencesKey("show_download_prompt")
        val autoDownload = booleanPreferencesKey("auto_download")
        val lastSurahId = intPreferencesKey("last_surah_id")
        val lastStartAyah = intPreferencesKey("last_start_ayah")
        val lastEndAyah = intPreferencesKey("last_end_ayah")
        val lastActiveAyah = intPreferencesKey("last_active_ayah")
    }
}
