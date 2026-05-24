package com.berkayyetgin.kuranayetezberle.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.berkayyetgin.kuranayetezberle.audio.PlaybackCoordinator
import com.berkayyetgin.kuranayetezberle.cache.AudioCacheRepository
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.QuranPagePolicy
import com.berkayyetgin.kuranayetezberle.data.QuranRepository
import com.berkayyetgin.kuranayetezberle.data.SurahEntity
import com.berkayyetgin.kuranayetezberle.domain.AyahRange
import com.berkayyetgin.kuranayetezberle.domain.PlaybackSessionState
import com.berkayyetgin.kuranayetezberle.domain.PracticeSessionController
import com.berkayyetgin.kuranayetezberle.settings.AppSettings
import com.berkayyetgin.kuranayetezberle.settings.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class PracticeUiState(
    val loading: Boolean = true,
    val surahs: List<SurahEntity> = emptyList(),
    val selectedSurahId: Int = 1,
    val ayahs: List<AyahWithDetails> = emptyList(),
    val startAyah: Int = 1,
    val endAyah: Int = 7,
    val selectedPage: Int = 1,
    val settings: AppSettings = AppSettings(),
    val sessionState: PlaybackSessionState = PlaybackSessionState.Idle,
    val error: String? = null,
) {
    val selectedSurah: SurahEntity? get() = surahs.firstOrNull { it.id == selectedSurahId }
    val visibleAyahs: List<AyahWithDetails>
        get() = ayahs.filter { it.page == selectedPage }
    val activeAyah: Int?
        get() = when (val session = sessionState) {
            is PlaybackSessionState.Active -> session.activeAyah
            is PlaybackSessionState.PausedByUser -> session.active.activeAyah
            else -> null
        }
    val canStart: Boolean
        get() {
            if (loading || ayahs.isEmpty() || selectedSurah == null) return false
            if (startAyah > endAyah) return false
            val availableAyahs = ayahs.mapTo(mutableSetOf()) { it.number }
            return (startAyah..endAyah).all { it in availableAyahs }
        }
}

@HiltViewModel
class PracticeViewModel @Inject constructor(
    private val quranRepository: QuranRepository,
    private val settingsRepository: SettingsRepository,
    private val playbackCoordinator: PlaybackCoordinator,
    private val audioCacheRepository: AudioCacheRepository,
    private val sessionController: PracticeSessionController,
) : ViewModel() {
    private val mutableUiState = MutableStateFlow(PracticeUiState())
    val uiState: StateFlow<PracticeUiState> = mutableUiState.asStateFlow()

    init {
        viewModelScope.launch(Dispatchers.IO) {
            settingsRepository.settings.collect { settings ->
                val previousTranslationAuthor = mutableUiState.value.settings.translationAuthorId
                mutableUiState.update { it.copy(settings = settings) }
                if (previousTranslationAuthor != settings.translationAuthorId) {
                    reloadSelectedSurah()
                }
            }
        }
        viewModelScope.launch {
            sessionController.state.collect { session ->
                val current = mutableUiState.value
                val activeAyah = when (session) {
                    is PlaybackSessionState.Active -> session.activeAyah
                    is PlaybackSessionState.PausedByUser -> session.active.activeAyah
                    else -> null
                }
                val activePage = activeAyah?.let { ayah ->
                    current.ayahs.firstOrNull { it.number == ayah }?.page
                }
                mutableUiState.update {
                    it.copy(
                        sessionState = session,
                        selectedPage = activePage ?: it.selectedPage,
                        error = (session as? PlaybackSessionState.Error)?.message ?: it.error,
                    )
                }
            }
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                quranRepository.initialize()
                val surahs = quranRepository.surahs()
                mutableUiState.update { it.copy(surahs = surahs, loading = false) }
                reloadSelectedSurah()
            }.onFailure { setError(it) }
        }
    }

    fun selectSurah(id: Int) = viewModelScope.launch {
        stopIfSessionStarted()
        val surah = mutableUiState.value.surahs.firstOrNull { it.id == id } ?: return@launch
        mutableUiState.update {
            it.copy(
                selectedSurahId = id,
                startAyah = 1,
                endAyah = surah.verseCount.coerceAtMost(7),
                error = null,
            )
        }
        reloadSelectedSurah()
    }

    fun setStartAyah(value: Int) {
        stopIfSessionStarted()
        val state = mutableUiState.value
        val max = state.selectedSurah?.verseCount ?: value
        val start = value.coerceIn(1, max)
        mutableUiState.update {
            it.copy(
                startAyah = start,
                endAyah = it.endAyah.coerceIn(start, max),
                selectedPage = it.pageForAyah(start),
                error = null,
            )
        }
    }

    fun setEndAyah(value: Int) {
        stopIfSessionStarted()
        val state = mutableUiState.value
        val max = state.selectedSurah?.verseCount ?: value
        mutableUiState.update {
            it.copy(
                endAyah = value.coerceIn(it.startAyah, max),
                error = null,
            )
        }
    }

    fun setPage(value: Int) {
        val state = mutableUiState.value
        val minPage = state.ayahs.minOfOrNull { it.page } ?: QuranPagePolicy.FIRST_PAGE
        val maxPage = state.ayahs.maxOfOrNull { it.page } ?: QuranPagePolicy.LAST_PAGE
        mutableUiState.update {
            it.copy(
                selectedPage = value.coerceIn(minPage, maxPage),
                error = null,
            )
        }
    }

    fun clearError() {
        mutableUiState.update { it.copy(error = null) }
    }

    fun setRepeatCount(value: Int) = viewModelScope.launch {
        stopIfSessionStarted()
        settingsRepository.setRepeatCount(value.coerceIn(1, 999))
    }

    fun setSpeed(value: Float) = viewModelScope.launch {
        val speed = value.coerceIn(0.5f, 2f)
        settingsRepository.setPlaybackSpeed(speed)
        playbackCoordinator.setSpeed(speed)
    }

    fun setArabicTextSizeSp(value: Float) = viewModelScope.launch {
        settingsRepository.setArabicTextSizeSp(value.coerceIn(24f, 38f))
    }

    fun toggleTranscription() = viewModelScope.launch {
        settingsRepository.setShowTranscription(!mutableUiState.value.settings.showTranscription)
    }

    fun toggleDarkTheme(currentDark: Boolean) = viewModelScope.launch {
        settingsRepository.setDarkTheme(!currentDark)
    }

    fun setTranslationAuthor(authorId: String) = viewModelScope.launch {
        settingsRepository.setTranslationAuthor(authorId)
    }

    fun start() = viewModelScope.launch {
        runCatching {
            val state = mutableUiState.value
            check(state.canStart) { "Unsupported state: selected ayah range is not ready." }
            val range = AyahRange(state.selectedSurahId, state.startAyah, state.endAyah)
            val audio = withContext(Dispatchers.IO) { quranRepository.audioForSurah(state.selectedSurahId) }
            mutableUiState.update { it.copy(error = null) }
            playbackCoordinator.start(
                audio = audio,
                ayahs = state.ayahs,
                range = range,
                repeatCount = state.settings.repeatCount,
                speed = state.settings.playbackSpeed,
            )
        }.onFailure { setError(it) }
    }

    fun pauseOrResume() {
        when (mutableUiState.value.sessionState) {
            is PlaybackSessionState.Active -> playbackCoordinator.pause()
            is PlaybackSessionState.PausedByUser -> playbackCoordinator.resumeFromUser()
            else -> Unit
        }
    }

    fun stop() = playbackCoordinator.stop()

    fun downloadSelectedSurah() = viewModelScope.launch {
        runCatching {
            val audio = withContext(Dispatchers.IO) {
                quranRepository.audioForSurah(mutableUiState.value.selectedSurahId)
            }
            audioCacheRepository.download(audio)
        }.onFailure { setError(it) }
    }

    fun downloadAllSurahs() = viewModelScope.launch {
        runCatching {
            val audios = withContext(Dispatchers.IO) {
                quranRepository.surahs().map { quranRepository.audioForSurah(it.id) }
            }
            audioCacheRepository.downloadAll(audios)
        }.onFailure { setError(it) }
    }

    fun clearCache() = viewModelScope.launch {
        stopIfSessionStarted()
        runCatching { audioCacheRepository.clear() }.onFailure { setError(it) }
    }

    private suspend fun reloadSelectedSurah() {
        val state = mutableUiState.value
        if (state.surahs.isEmpty()) return
        runCatching {
            val ayahs = withContext(Dispatchers.IO) {
                quranRepository.ayahsForSurah(
                    surahId = state.selectedSurahId,
                    translationAuthorId = state.settings.translationAuthorId,
                )
            }
            val page = ayahs.firstOrNull { it.number == state.startAyah }?.page ?: ayahs.firstOrNull()?.page ?: 1
            mutableUiState.update { it.copy(ayahs = ayahs, selectedPage = page) }
        }.onFailure { setError(it) }
    }

    private fun setError(error: Throwable) {
        stopIfSessionStarted()
        mutableUiState.update {
            it.copy(
                loading = false,
                error = error.message ?: "Unsupported state.",
            )
        }
        sessionController.fail(error.message ?: "Unsupported state.")
    }

    private fun PracticeUiState.pageForAyah(ayahNumber: Int): Int =
        ayahs.firstOrNull { it.number == ayahNumber }?.page ?: selectedPage

    private fun stopIfSessionStarted() {
        when (mutableUiState.value.sessionState) {
            is PlaybackSessionState.Active, is PlaybackSessionState.PausedByUser -> playbackCoordinator.stop()
            else -> Unit
        }
    }
}
