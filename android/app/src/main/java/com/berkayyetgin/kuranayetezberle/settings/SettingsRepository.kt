package com.berkayyetgin.kuranayetezberle.settings

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("settings")

data class AppSettings(
    val translationAuthorId: String = "6",
    val showTranscription: Boolean = true,
    val darkTheme: Boolean? = null,
    val playbackSpeed: Float = 1f,
    val repeatCount: Int = 20,
    val arabicTextSizeSp: Float = 30f,
)

class SettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val settings: Flow<AppSettings> = context.dataStore.data.map { preferences ->
        AppSettings(
            translationAuthorId = preferences[Keys.translationAuthorId] ?: "6",
            showTranscription = preferences[Keys.showTranscription] ?: true,
            darkTheme = preferences[Keys.darkTheme],
            playbackSpeed = preferences[Keys.playbackSpeed] ?: 1f,
            repeatCount = preferences[Keys.repeatCount] ?: 20,
            arabicTextSizeSp = preferences[Keys.arabicTextSizeSp] ?: 30f,
        )
    }

    suspend fun setRepeatCount(value: Int) = context.dataStore.edit { it[Keys.repeatCount] = value }
    suspend fun setPlaybackSpeed(value: Float) = context.dataStore.edit { it[Keys.playbackSpeed] = value }
    suspend fun setTranslationAuthor(value: String) = context.dataStore.edit { it[Keys.translationAuthorId] = value }
    suspend fun setShowTranscription(value: Boolean) = context.dataStore.edit { it[Keys.showTranscription] = value }
    suspend fun setDarkTheme(value: Boolean) = context.dataStore.edit { it[Keys.darkTheme] = value }
    suspend fun setArabicTextSizeSp(value: Float) = context.dataStore.edit { it[Keys.arabicTextSizeSp] = value }

    private object Keys {
        val translationAuthorId = stringPreferencesKey("translation_author_id")
        val showTranscription = booleanPreferencesKey("show_transcription")
        val darkTheme = booleanPreferencesKey("dark_theme")
        val playbackSpeed = floatPreferencesKey("playback_speed")
        val repeatCount = intPreferencesKey("repeat_count")
        val arabicTextSizeSp = floatPreferencesKey("arabic_text_size_sp")
    }
}
