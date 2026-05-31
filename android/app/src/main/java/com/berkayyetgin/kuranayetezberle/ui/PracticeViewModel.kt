package com.berkayyetgin.kuranayetezberle.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.berkayyetgin.kuranayetezberle.audio.PlaybackCoordinator
import com.berkayyetgin.kuranayetezberle.cache.AudioCacheRepository
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.ReciterOption
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

/** Tracks the state of a background audio download operation. */
sealed interface DownloadState {
    data object Idle : DownloadState
    data class InProgress(
        val label: String,
        val downloadedBytes: Long = 0L,
        val totalBytes: Long? = null,
        val completedItems: Int? = null,
        val totalItems: Int? = null,
    ) : DownloadState {
        val fraction: Float?
            get() = totalBytes
                ?.takeIf { it > 0L }
                ?.let { (downloadedBytes.toFloat() / it.toFloat()).coerceIn(0f, 1f) }
                ?: if (completedItems != null && totalItems != null && totalItems > 0) {
                    (completedItems.toFloat() / totalItems.toFloat()).coerceIn(0f, 1f)
                } else {
                    null
                }

        val percentLabel: String?
            get() = fraction?.let { "${(it * 100).toInt()}%" }
    }
    /** Download completed. [failureCount] > 0 means some surahs could not be downloaded. */
    data class Done(val successCount: Int, val failureCount: Int) : DownloadState
}

data class PracticeUiState(
    val loading: Boolean = true,
    val surahs: List<SurahEntity> = emptyList(),
    val reciters: List<ReciterOption> = emptyList(),
    val selectedSurahId: Int = 1,
    val selectedSurah: SurahEntity? = null,
    val ayahs: List<AyahWithDetails> = emptyList(),
    val startAyah: Int = 1,
    val endAyah: Int = 7,
    val selectedPage: Int = 1,
    val settings: AppSettings = AppSettings(),
    val sessionState: PlaybackSessionState = PlaybackSessionState.Idle,
    /** Reflects whether the currently selected surah is fully available in the local cache. */
    val isSelectedSurahCached: Boolean = false,
    /** Number of surahs whose audio is fully available in the local cache. */
    val cachedSurahCount: Int = 0,
    /** Reflects the state of any active download triggered by the user. */
    val downloadState: DownloadState = DownloadState.Idle,
    val restoredActiveAyah: Int? = null,
    val error: String? = null,
) {
    val selectedSurahFromId: SurahEntity? get() = surahs.firstOrNull { it.id == selectedSurahId }
    val selectedReciter: ReciterOption? get() = reciters.firstOrNull { it.id == settings.reciterId }
    val activeAyah: Int?
        get() = when (val session = sessionState) {
            is PlaybackSessionState.Active -> session.activeAyah
            is PlaybackSessionState.PausedByUser -> session.active.activeAyah
            else -> restoredActiveAyah
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
    private var isInitialSettingsLoad = true
    private val mutableUiState = MutableStateFlow(PracticeUiState())
    val uiState: StateFlow<PracticeUiState> = mutableUiState.asStateFlow()

    init {
        viewModelScope.launch(Dispatchers.IO) {
            settingsRepository.settings.collect { settings ->
                val current = mutableUiState.value
                val previousTranslationAuthor = current.settings.translationAuthorId
                val previousReciter = current.settings.reciterId
                
                if (isInitialSettingsLoad) {
                    isInitialSettingsLoad = false
                    mutableUiState.update { 
                        it.copy(
                            settings = settings,
                            selectedSurahId = settings.lastSurahId,
                            startAyah = settings.lastStartAyah,
                            endAyah = settings.lastEndAyah,
                            restoredActiveAyah = settings.lastActiveAyah,
                        )
                    }
                    if (!current.loading) {
                        reloadSelectedSurah()
                    }
                } else {
                    mutableUiState.update { it.copy(settings = settings) }
                    if (
                        previousTranslationAuthor != settings.translationAuthorId ||
                        previousReciter != settings.reciterId
                    ) {
                        stopIfSessionStarted()
                        reloadSelectedSurah()
                        if (previousReciter != settings.reciterId) {
                            val surahs = mutableUiState.value.surahs
                            val newCachedCount = cachedSurahCount(surahs)
                            mutableUiState.update { it.copy(cachedSurahCount = newCachedCount) }
                        }
                    }
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
                        restoredActiveAyah = if (session !is PlaybackSessionState.Idle) null else it.restoredActiveAyah
                    )
                }
                if (activeAyah != null) {
                    saveLastSession()
                }
            }
        }
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                quranRepository.initialize()
                val surahs = quranRepository.surahs()
                val reciters = quranRepository.reciters()
                val cachedSurahCount = cachedSurahCount(surahs)
                mutableUiState.update {
                    it.copy(
                        surahs = surahs,
                        reciters = reciters,
                        cachedSurahCount = cachedSurahCount,
                        loading = false,
                    )
                }
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
                restoredActiveAyah = null,
                error = null,
            )
        }
        saveLastSession()
        reloadSelectedSurah()
    }

    fun nextSurah() {
        val current = mutableUiState.value.selectedSurahId
        if (current < 114) selectSurah(current + 1)
    }

    fun previousSurah() {
        val current = mutableUiState.value.selectedSurahId
        if (current > 1) selectSurah(current - 1)
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
                restoredActiveAyah = null,
                error = null,
            )
        }
        saveLastSession()
    }

    fun setEndAyah(value: Int) {
        stopIfSessionStarted()
        val state = mutableUiState.value
        val max = state.selectedSurah?.verseCount ?: value
        mutableUiState.update {
            it.copy(
                endAyah = value.coerceIn(it.startAyah, max),
                restoredActiveAyah = null,
                error = null,
            )
        }
        saveLastSession()
    }

    fun setStartAndEndAyah(ayahNumber: Int) {
        stopIfSessionStarted()
        val state = mutableUiState.value
        val max = state.selectedSurah?.verseCount ?: ayahNumber
        val target = ayahNumber.coerceIn(1, max)
        mutableUiState.update {
            it.copy(
                startAyah = target,
                endAyah = target,
                selectedPage = it.pageForAyah(target),
                restoredActiveAyah = null,
                error = null,
            )
        }
        saveLastSession()
    }

    fun setPage(value: Int) {
        val state = mutableUiState.value
        val minPage = state.ayahs.minOfOrNull { it.page } ?: QuranPagePolicy.FIRST_PAGE
        val maxPage = state.ayahs.maxOfOrNull { it.page } ?: QuranPagePolicy.LAST_PAGE
        val targetPage = value.coerceIn(minPage, maxPage)
        mutableUiState.update {
            it.copy(
                selectedPage = targetPage,
                error = null,
            )
        }
    }

    fun onPageSwipe(pageNumber: Int) {
        setPage(pageNumber)
    }

    fun clearError() {
        mutableUiState.update { it.copy(error = null) }
    }

    private fun saveLastSession() = viewModelScope.launch {
        val state = mutableUiState.value
        settingsRepository.saveLastSession(
            state.selectedSurahId,
            state.startAyah,
            state.endAyah,
            state.activeAyah
        )
    }

    /** Clears the Done download state after the UI has shown the result to the user. */
    fun clearDownloadDone() {
        if (mutableUiState.value.downloadState is DownloadState.Done) {
            mutableUiState.update { it.copy(downloadState = DownloadState.Idle) }
        }
    }

    fun setRepeatCount(value: Int) = viewModelScope.launch {
        val coerced = value.coerceIn(1, 999)
        settingsRepository.setRepeatCount(coerced)
        sessionController.updateRepeatTarget(coerced)
    }

    fun setSpeed(value: Float) = viewModelScope.launch {
        val speed = value.coerceIn(0.5f, 2f)
        settingsRepository.setPlaybackSpeed(speed)
        playbackCoordinator.setSpeed(speed)
    }

    fun setArabicTextSizeSp(value: Float) = viewModelScope.launch {
        settingsRepository.setArabicTextSizeSp(value.coerceIn(24f, 38f))
    }

    fun setShowDownloadPrompt(value: Boolean) = viewModelScope.launch {
        settingsRepository.setShowDownloadPrompt(value)
    }

    fun setAutoDownload(value: Boolean) = viewModelScope.launch {
        settingsRepository.setAutoDownload(value)
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

    fun setReciter(reciterId: Int) = viewModelScope.launch {
        settingsRepository.setReciter(reciterId)
    }

    fun start(): kotlinx.coroutines.Job = viewModelScope.launch {
        runCatching {
            val state = mutableUiState.value
            check(state.canStart) { "Unsupported state: selected ayah range is not ready." }
            // If autoDownload is enabled and the surah is not cached, trigger download-then-play.
            if (state.settings.autoDownload && !state.isSelectedSurahCached) {
                downloadSelectedSurah(playAfterDownload = true)
                return@launch
            }
            val range = AyahRange(state.selectedSurahId, state.startAyah, state.endAyah)
            val audio = withContext(Dispatchers.IO) {
                quranRepository.playbackAudioForRange(
                    surahId = state.selectedSurahId,
                    startAyah = state.startAyah,
                    endAyah = state.endAyah,
                    reciterId = state.settings.reciterId,
                )
            }
            mutableUiState.update { it.copy(error = null) }
            playbackCoordinator.start(
                audio = audio,
                ayahs = state.ayahs,
                range = range,
                repeatCount = state.settings.repeatCount,
                speed = state.settings.playbackSpeed,
                surahName = state.selectedSurah?.name ?: "Sure"
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

    /** Downloads the currently selected surah. No-ops if a download is already in progress. */
    fun downloadSelectedSurah(playAfterDownload: Boolean = false): kotlinx.coroutines.Job = viewModelScope.launch {
        if (mutableUiState.value.downloadState is DownloadState.InProgress) return@launch
        val initialState = mutableUiState.value
        val label = "${initialState.selectedSurah?.name ?: "Seçili sure"} indiriliyor"
        mutableUiState.update { it.copy(downloadState = DownloadState.InProgress(label = label)) }
        val audio = runCatching {
            selectedSurahPlaybackAudio()
        }.getOrElse { e ->
            mutableUiState.update {
                it.copy(
                    downloadState = DownloadState.Idle,
                    error = downloadErrorMessage(e),
                )
            }
            return@launch
        }
        var lastProgressUiUpdateAtMs = 0L
        val downloadResult = runCatching {
            audioCacheRepository.download(
                audio = audio,
                onProgress = { downloadedBytes, totalBytes ->
                    val now = System.currentTimeMillis()
                    val isComplete = totalBytes?.let { downloadedBytes >= it } == true
                    if (isComplete || now - lastProgressUiUpdateAtMs >= 160L) {
                        lastProgressUiUpdateAtMs = now
                        mutableUiState.update {
                            it.copy(
                                downloadState = DownloadState.InProgress(
                                    label = label,
                                    downloadedBytes = downloadedBytes,
                                    totalBytes = totalBytes,
                                )
                            )
                        }
                    }
                },
                onItemCompleted = { completedCount, totalCount ->
                    mutableUiState.update {
                        it.copy(
                            downloadState = DownloadState.InProgress(
                                label = label,
                                completedItems = completedCount,
                                totalItems = totalCount,
                            )
                        )
                    }
                },
            )
        }

        downloadResult.exceptionOrNull()?.let { e ->
            mutableUiState.update {
                it.copy(
                    downloadState = DownloadState.Idle,
                    error = downloadErrorMessage(e),
                )
            }
            return@launch
        }

        val cachedSurahCount = cachedSurahCount()
        val isSelectedSurahCached = withContext(Dispatchers.IO) { audioCacheRepository.isCached(audio) }
        mutableUiState.update {
            it.copy(
                downloadState = DownloadState.Done(successCount = 1, failureCount = 0),
                isSelectedSurahCached = isSelectedSurahCached,
                cachedSurahCount = cachedSurahCount,
            )
        }
        if (playAfterDownload) start()
    }

    /**
     * Downloads all 114 surahs with per-surah error isolation (app-lifetime coroutine).
     * No-ops if a download is already in progress.
     */
    fun downloadAllSurahs() = viewModelScope.launch {
        if (mutableUiState.value.downloadState is DownloadState.InProgress) return@launch
        mutableUiState.update {
            it.copy(downloadState = DownloadState.InProgress(label = "Tüm sureler indiriliyor"))
        }
        val audios = runCatching {
            withContext(Dispatchers.IO) {
                val reciterId = mutableUiState.value.settings.reciterId
                quranRepository.surahs().map { surah ->
                    quranRepository.playbackAudioForRange(
                        surahId = surah.id,
                        startAyah = 1,
                        endAyah = surah.verseCount,
                        reciterId = reciterId,
                    )
                }
            }
        }.getOrElse { e ->
            mutableUiState.update {
                it.copy(
                    downloadState = DownloadState.Idle,
                    error = downloadErrorMessage(e),
                )
            }
            return@launch
        }
        val result = audioCacheRepository.downloadAllPlayback(audios) { completedCount, totalCount ->
            mutableUiState.update {
                it.copy(
                    downloadState = DownloadState.InProgress(
                        label = "Tüm sureler indiriliyor",
                        completedItems = completedCount,
                        totalItems = totalCount,
                    )
                )
            }
        }
        val currentAudio = runCatching { selectedSurahPlaybackAudio() }.getOrNull()
        val isSelectedSurahCached = currentAudio?.let { audio ->
            withContext(Dispatchers.IO) { audioCacheRepository.isCached(audio) }
        } ?: false
        val cachedSurahCount = cachedSurahCount()
        mutableUiState.update {
            it.copy(
                downloadState = DownloadState.Done(result.successCount, result.failureCount),
                isSelectedSurahCached = isSelectedSurahCached,
                cachedSurahCount = cachedSurahCount,
            )
        }
    }

    fun clearCache() = viewModelScope.launch {
        stopIfSessionStarted()
        runCatching { audioCacheRepository.clear() }
            .onSuccess {
                mutableUiState.update {
                    it.copy(
                        isSelectedSurahCached = false,
                        cachedSurahCount = 0,
                    )
                }
            }
            .onFailure { setError(it) }
    }

    private suspend fun reloadSelectedSurah() {
        val state = mutableUiState.value
        if (state.surahs.isEmpty()) return
        runCatching {
            val ayahs = withContext(Dispatchers.IO) {
                quranRepository.ayahsForSurah(
                    surahId = state.selectedSurahId,
                    translationAuthorId = state.settings.translationAuthorId,
                    reciterId = state.settings.reciterId,
                )
            }
            val audio = runCatching {
                selectedSurahPlaybackAudio()
            }.getOrNull()
            val isCached = audio?.let { audioCacheRepository.isCached(it) } ?: false
            val page = ayahs.firstOrNull { it.number == state.startAyah }?.page
                ?: ayahs.firstOrNull()?.page ?: 1
            mutableUiState.update {
                it.copy(
                    ayahs = ayahs,
                    selectedPage = page,
                    isSelectedSurahCached = isCached,
                    selectedSurah = it.surahs.find { s -> s.id == it.selectedSurahId },
                )
            }
        }.onFailure { setError(it) }
    }

    private fun downloadErrorMessage(error: Throwable): String =
        error.message?.takeIf { it.isNotBlank() } ?: "İndirme başarısız. Bağlantını kontrol edip tekrar dene."

    private suspend fun cachedSurahCount(
        surahs: List<SurahEntity> = mutableUiState.value.surahs,
    ): Int = withContext(Dispatchers.IO) {
        val reciterId = mutableUiState.value.settings.reciterId
        surahs.count { surah ->
            runCatching {
                val audio = quranRepository.playbackAudioForRange(
                    surahId = surah.id,
                    startAyah = 1,
                    endAyah = surah.verseCount,
                    reciterId = reciterId,
                )
                audioCacheRepository.isCached(audio)
            }.getOrDefault(false)
        }
    }

    private suspend fun selectedSurahPlaybackAudio() = withContext(Dispatchers.IO) {
        val state = mutableUiState.value
        val selectedSurah = state.selectedSurah ?: state.selectedSurahFromId
        val endAyah = selectedSurah?.verseCount ?: state.ayahs.maxOfOrNull { it.number } ?: state.endAyah
        quranRepository.playbackAudioForRange(
            surahId = state.selectedSurahId,
            startAyah = 1,
            endAyah = endAyah,
            reciterId = state.settings.reciterId,
        )
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

    fun selectPageRange() {
        stopIfSessionStarted()
        val state = mutableUiState.value
        val pageAyahs = state.ayahs.filter { it.page == state.selectedPage }
        if (pageAyahs.isEmpty()) return
        val start = pageAyahs.minOf { it.number }
        val end = pageAyahs.maxOf { it.number }
        mutableUiState.update {
            it.copy(
                startAyah = start,
                endAyah = end,
                restoredActiveAyah = null,
                error = null,
            )
        }
        saveLastSession()
    }

    fun setStartToPageStart() {
        stopIfSessionStarted()
        val state = mutableUiState.value
        val pageAyahs = state.ayahs.filter { it.page == state.selectedPage }
        if (pageAyahs.isEmpty()) return
        val start = pageAyahs.minOf { it.number }
        setStartAyah(start)
    }

    fun setEndToPageEnd() {
        stopIfSessionStarted()
        val state = mutableUiState.value
        val pageAyahs = state.ayahs.filter { it.page == state.selectedPage }
        if (pageAyahs.isEmpty()) return
        val end = pageAyahs.maxOf { it.number }
        setEndAyah(end)
    }

    fun selectSurahRange() {
        stopIfSessionStarted()
        val state = mutableUiState.value
        if (state.ayahs.isEmpty()) return
        val start = 1
        val end = state.selectedSurah?.verseCount ?: state.ayahs.maxOf { it.number }
        mutableUiState.update {
            it.copy(
                startAyah = start,
                endAyah = end,
                restoredActiveAyah = null,
                error = null,
            )
        }
        saveLastSession()
    }

    fun setStartToFirst() {
        setStartAyah(1)
    }

    fun setEndToSurahEnd() {
        val state = mutableUiState.value
        val end = state.selectedSurah?.verseCount ?: return
        setEndAyah(end)
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
