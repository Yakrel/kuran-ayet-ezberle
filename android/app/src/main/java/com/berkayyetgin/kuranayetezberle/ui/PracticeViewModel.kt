package com.berkayyetgin.kuranayetezberle.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.WorkInfo
import androidx.work.WorkManager
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
import com.berkayyetgin.kuranayetezberle.download.DownloadAllSurahsWorker
import com.berkayyetgin.kuranayetezberle.settings.AppSettings
import com.berkayyetgin.kuranayetezberle.settings.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
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
    /** True while the screen is in surah-loop mode (whole surahs instead of an ayah range). */
    val isLoopMode: Boolean = false,
    /** Surahs of the loop in play order. */
    val loopSurahIds: List<Int> = emptyList(),
    /** Reflects whether every surah of the loop is fully available in the local cache. */
    val isLoopCached: Boolean = false,
    val error: String? = null,
) {
    val selectedSurahFromId: SurahEntity? get() = surahs.firstOrNull { it.id == selectedSurahId }
    val selectedReciter: ReciterOption? get() = reciters.firstOrNull { it.id == settings.reciterId }
    /** Playing ayah, only while the playing surah is the one on screen. */
    val activeAyah: Int?
        get() = when (val session = sessionState) {
            is PlaybackSessionState.Active -> session.activeAyah.takeIf { session.activeSurahId == selectedSurahId }
            is PlaybackSessionState.PausedByUser ->
                session.active.activeAyah.takeIf { session.active.activeSurahId == selectedSurahId }
            else -> restoredActiveAyah
        }
    val activeSurahId: Int?
        get() = when (val session = sessionState) {
            is PlaybackSessionState.Active -> session.activeSurahId
            is PlaybackSessionState.PausedByUser -> session.active.activeSurahId
            else -> null
        }
    /** Cache state of whatever Play would start: the loop, or the selected surah. */
    val isPlaybackSetCached: Boolean get() = if (isLoopMode) isLoopCached else isSelectedSurahCached
    val canSelectPreviousSurah: Boolean
        get() = if (isLoopMode) loopSurahIds.indexOf(selectedSurahId) > 0 else selectedSurahId > 1
    val canSelectNextSurah: Boolean
        get() = if (isLoopMode) {
            loopSurahIds.indexOf(selectedSurahId).let { it >= 0 && it < loopSurahIds.lastIndex }
        } else {
            selectedSurahId < 114
        }
    val canStart: Boolean
        get() {
            if (isLoopMode) return !loading && loopSurahIds.isNotEmpty()
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
    private val workManager: WorkManager,
) : ViewModel() {
    private var isInitialSettingsLoad = true
    private var observedAllDownloadId: UUID? = null
    private val reloadGeneration = AtomicInteger(0)
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
                            isLoopMode = settings.surahLoopEnabled,
                            loopSurahIds = settings.surahLoopIds,
                            selectedSurahId = settings.surahLoopIds.firstOrNull()
                                ?.takeIf { settings.surahLoopEnabled }
                                ?: settings.lastSurahId,
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
                val activeSurahId = when (session) {
                    is PlaybackSessionState.Active -> session.activeSurahId
                    is PlaybackSessionState.PausedByUser -> session.active.activeSurahId
                    else -> null
                }
                val activeAyah = when (session) {
                    is PlaybackSessionState.Active -> session.activeAyah
                    is PlaybackSessionState.PausedByUser -> session.active.activeAyah
                    else -> null
                }
                // A surah loop crosses surah boundaries; the screen follows the playing surah.
                val followSurahId = activeSurahId?.takeIf { current.isLoopMode && it != current.selectedSurahId }
                val activePage = activeAyah
                    ?.takeIf { followSurahId == null }
                    ?.let { ayah -> current.ayahs.firstOrNull { it.number == ayah }?.page }
                mutableUiState.update {
                    it.copy(
                        sessionState = session,
                        selectedPage = activePage ?: it.selectedPage,
                        error = (session as? PlaybackSessionState.Error)?.message ?: it.error,
                        restoredActiveAyah = if (session !is PlaybackSessionState.Idle) null else it.restoredActiveAyah
                    )
                }
                if (followSurahId != null) showLoopSurah(followSurahId)
                if (activeAyah != null && !current.isLoopMode) {
                    saveLastSession()
                }
            }
        }
        viewModelScope.launch {
            workManager.getWorkInfosForUniqueWorkFlow(DownloadAllSurahsWorker.UNIQUE_WORK_NAME)
                .collect(::observeAllDownloadWork)
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
        applySelectedSurah(id)
    }

    private suspend fun applySelectedSurah(id: Int) {
        val surah = mutableUiState.value.surahs.firstOrNull { it.id == id } ?: return
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

    fun nextSurah() = stepSurah(1)

    fun previousSurah() = stepSurah(-1)

    /** Moves to the neighbouring surah: within the loop in loop mode, else by surah number. */
    private fun stepSurah(delta: Int) {
        val state = mutableUiState.value
        if (state.isLoopMode) {
            val index = state.loopSurahIds.indexOf(state.selectedSurahId)
            if (index < 0) return
            state.loopSurahIds.getOrNull(index + delta)?.let(::showLoopSurah)
        } else {
            val target = state.selectedSurahId + delta
            if (target in 1..114) selectSurah(target)
        }
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
            if (state.settings.autoDownload && !state.isPlaybackSetCached) {
                downloadSelectedSurah(playAfterDownload = true)
                return@launch
            }
            if (state.isLoopMode) {
                startSurahLoop(state)
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
        if (mutableUiState.value.isLoopMode) {
            downloadLoopSurahs(playAfterDownload)
            return@launch
        }
        val initialState = mutableUiState.value
        val requestedSurahId = initialState.selectedSurahId
        val requestedReciterId = initialState.settings.reciterId
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
        val currentState = mutableUiState.value
        if (
            playAfterDownload &&
            currentState.selectedSurahId == requestedSurahId &&
            currentState.settings.reciterId == requestedReciterId
        ) {
            start()
        }
    }

    /** Enqueues a process-resilient, foreground WorkManager download for all 114 surahs. */
    fun downloadAllSurahs() {
        if (mutableUiState.value.downloadState is DownloadState.InProgress) return
        observedAllDownloadId = DownloadAllSurahsWorker.enqueue(
            workManager = workManager,
            reciterId = mutableUiState.value.settings.reciterId,
        )
        mutableUiState.update {
            it.copy(downloadState = DownloadState.InProgress(label = "Tüm sureler indiriliyor"))
        }
    }

    private suspend fun observeAllDownloadWork(workInfos: List<WorkInfo>) {
        val active = workInfos.firstOrNull {
            it.state == WorkInfo.State.ENQUEUED ||
                it.state == WorkInfo.State.BLOCKED ||
                it.state == WorkInfo.State.RUNNING
        }
        if (active != null) {
            observedAllDownloadId = active.id
            val completed = active.progress.getInt(DownloadAllSurahsWorker.KEY_COMPLETED, 0)
            val total = active.progress.getInt(DownloadAllSurahsWorker.KEY_TOTAL, 114)
            mutableUiState.update {
                it.copy(
                    downloadState = DownloadState.InProgress(
                        label = if (active.state == WorkInfo.State.RUNNING) {
                            "Tüm sureler indiriliyor"
                        } else {
                            "İndirme için bağlantı bekleniyor"
                        },
                        completedItems = completed,
                        totalItems = total,
                    ),
                )
            }
            return
        }

        val observedId = observedAllDownloadId ?: return
        val finished = workInfos.firstOrNull { it.id == observedId && it.state.isFinished } ?: return
        observedAllDownloadId = null
        when (finished.state) {
            WorkInfo.State.SUCCEEDED -> {
                val currentAudio = runCatching { selectedSurahPlaybackAudio() }.getOrNull()
                val selectedCached = currentAudio?.let { audioCacheRepository.isCached(it) } ?: false
                val cachedCount = cachedSurahCount()
                val loopState = mutableUiState.value
                val loopCached = computeLoopCached(loopState.loopSurahIds, loopState.settings.reciterId)
                mutableUiState.update {
                    it.copy(
                        downloadState = DownloadState.Done(
                            successCount = finished.outputData.getInt(
                                DownloadAllSurahsWorker.KEY_SUCCESS_COUNT,
                                cachedCount,
                            ),
                            failureCount = finished.outputData.getInt(
                                DownloadAllSurahsWorker.KEY_FAILURE_COUNT,
                                0,
                            ),
                        ),
                        isSelectedSurahCached = selectedCached,
                        isLoopCached = loopCached,
                        cachedSurahCount = cachedCount,
                    )
                }
            }
            WorkInfo.State.FAILED -> mutableUiState.update {
                it.copy(
                    downloadState = DownloadState.Idle,
                    error = finished.outputData.getString(DownloadAllSurahsWorker.KEY_ERROR)
                        ?: "İndirme tamamlanamadı.",
                )
            }
            WorkInfo.State.CANCELLED -> mutableUiState.update {
                it.copy(downloadState = DownloadState.Idle)
            }
            else -> Unit
        }
    }

    fun clearCache() = viewModelScope.launch {
        stopIfSessionStarted()
        runCatching { audioCacheRepository.clear() }
            .onSuccess {
                mutableUiState.update {
                    it.copy(
                        isSelectedSurahCached = false,
                        isLoopCached = false,
                    )
                }
            }
            .onFailure { setError(it) }
    }

    private suspend fun reloadSelectedSurah() {
        val generation = reloadGeneration.incrementAndGet()
        val requestedState = mutableUiState.value
        if (requestedState.surahs.isEmpty()) return
        runCatching {
            val selectedSurah = requestedState.surahs.firstOrNull { it.id == requestedState.selectedSurahId }
                ?: return@runCatching
            val ayahs = withContext(Dispatchers.IO) {
                quranRepository.ayahsForSurah(
                    surahId = requestedState.selectedSurahId,
                    translationAuthorId = requestedState.settings.translationAuthorId,
                    reciterId = requestedState.settings.reciterId,
                )
            }
            val audio = runCatching {
                quranRepository.playbackAudioForRange(
                    surahId = requestedState.selectedSurahId,
                    startAyah = 1,
                    endAyah = selectedSurah.verseCount,
                    reciterId = requestedState.settings.reciterId,
                )
            }.getOrNull()
            val isCached = audio?.let { audioCacheRepository.isCached(it) } ?: false
            val loopCached = if (requestedState.isLoopMode) {
                computeLoopCached(requestedState.loopSurahIds, requestedState.settings.reciterId)
            } else {
                false
            }
            val currentState = mutableUiState.value
            val requestIsCurrent = generation == reloadGeneration.get() &&
                currentState.selectedSurahId == requestedState.selectedSurahId &&
                currentState.settings.translationAuthorId == requestedState.settings.translationAuthorId &&
                currentState.settings.reciterId == requestedState.settings.reciterId
            if (!requestIsCurrent) return@runCatching

            // Only trust the playing ayah when the session is on the surah being loaded.
            val activeAyah = when (val session = currentState.sessionState) {
                is PlaybackSessionState.Active ->
                    session.activeAyah.takeIf { session.activeSurahId == requestedState.selectedSurahId }
                is PlaybackSessionState.PausedByUser ->
                    session.active.activeAyah.takeIf { session.active.activeSurahId == requestedState.selectedSurahId }
                else -> null
            }
            val validStartAyah = currentState.startAyah.coerceIn(1, selectedSurah.verseCount)
            val validEndAyah = currentState.endAyah.coerceIn(validStartAyah, selectedSurah.verseCount)
            // In loop mode the single-surah ayah range is left untouched for when the mode is switched off.
            val targetAyah = activeAyah ?: if (currentState.isLoopMode) 1 else validStartAyah
            val page = ayahs.firstOrNull { it.number == targetAyah }?.page
                ?: ayahs.firstOrNull()?.page ?: 1
            mutableUiState.update {
                it.copy(
                    ayahs = ayahs,
                    startAyah = if (it.isLoopMode) it.startAyah else validStartAyah,
                    endAyah = if (it.isLoopMode) it.endAyah else validEndAyah,
                    selectedPage = page,
                    isSelectedSurahCached = isCached,
                    isLoopCached = loopCached,
                    selectedSurah = selectedSurah,
                    restoredActiveAyah = it.restoredActiveAyah?.takeIf { ayah -> ayah in 1..selectedSurah.verseCount },
                )
            }
        }.onFailure {
            if (generation == reloadGeneration.get()) setError(it)
        }
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

    // ─── Surah loop mode ─────────────────────────────────────────────────────

    fun setLoopMode(enabled: Boolean) = viewModelScope.launch {
        val state = mutableUiState.value
        if (state.isLoopMode == enabled) return@launch
        stopIfSessionStarted()
        mutableUiState.update { it.copy(isLoopMode = enabled, restoredActiveAyah = null, error = null) }
        persistSurahLoop()
        if (enabled) {
            val first = state.loopSurahIds.firstOrNull()
            if (first != null && state.selectedSurahId !in state.loopSurahIds) {
                showLoopSurah(first)
            } else {
                reloadSelectedSurah()
            }
        } else {
            applySelectedSurah(state.selectedSurahId)
        }
    }

    fun toggleLoopSurah(surahId: Int) {
        val ids = mutableUiState.value.loopSurahIds
        updateLoopSurahIds(if (surahId in ids) ids - surahId else ids + surahId, membershipChanged = true)
    }

    fun moveLoopSurah(from: Int, to: Int) {
        val ids = mutableUiState.value.loopSurahIds
        if (from !in ids.indices || to !in ids.indices || from == to) return
        updateLoopSurahIds(
            ids.toMutableList().apply { add(to, removeAt(from)) },
            membershipChanged = false,
        )
    }

    private fun updateLoopSurahIds(ids: List<Int>, membershipChanged: Boolean) {
        stopIfSessionStarted()
        val state = mutableUiState.value
        mutableUiState.update { it.copy(loopSurahIds = ids, restoredActiveAyah = null, error = null) }
        persistSurahLoop()
        if (!membershipChanged) return
        if (state.isLoopMode && state.selectedSurahId !in ids) ids.firstOrNull()?.let(::showLoopSurah)
        viewModelScope.launch { refreshLoopCached() }
    }

    private fun persistSurahLoop() = viewModelScope.launch {
        val state = mutableUiState.value
        settingsRepository.saveSurahLoop(state.isLoopMode, state.loopSurahIds)
    }

    /** Displays [surahId] without touching playback or the single-surah ayah range. */
    private fun showLoopSurah(surahId: Int) {
        mutableUiState.update {
            it.copy(
                selectedSurahId = surahId,
                selectedSurah = it.surahs.firstOrNull { surah -> surah.id == surahId },
                ayahs = emptyList(),
                restoredActiveAyah = null,
            )
        }
        viewModelScope.launch { reloadSelectedSurah() }
    }

    private suspend fun startSurahLoop(state: PracticeUiState) {
        val surahIds = state.loopSurahIds
        val reciterId = state.settings.reciterId
        val audios = withContext(Dispatchers.IO) {
            quranRepository.playbackAudioForSurahs(surahIds, reciterId)
        }
        val ayahsBySurah = withContext(Dispatchers.IO) {
            surahIds.associateWith { surahId ->
                quranRepository.ayahsForSurah(surahId, state.settings.translationAuthorId, reciterId)
            }
        }
        mutableUiState.update { it.copy(error = null) }
        playbackCoordinator.startSurahs(
            audios = audios,
            ayahsBySurah = ayahsBySurah,
            surahNames = state.surahs.associate { it.id to it.name },
            repeatCount = state.settings.repeatCount,
            speed = state.settings.playbackSpeed,
        )
    }

    private suspend fun downloadLoopSurahs(playAfterDownload: Boolean) {
        val requested = mutableUiState.value
        val surahIds = requested.loopSurahIds
        val reciterId = requested.settings.reciterId
        val label = "${surahIds.size} sure indiriliyor"
        mutableUiState.update { it.copy(downloadState = DownloadState.InProgress(label = label)) }
        val result = runCatching {
            val audios = withContext(Dispatchers.IO) {
                quranRepository.playbackAudioForSurahs(surahIds, reciterId)
            }
            audioCacheRepository.downloadAllPlayback(audios) { completedCount, totalCount ->
                mutableUiState.update {
                    it.copy(
                        downloadState = DownloadState.InProgress(
                            label = label,
                            completedItems = completedCount,
                            totalItems = totalCount,
                        ),
                    )
                }
            }
        }
        val failure = result.exceptionOrNull()
            ?: result.getOrNull()?.failureCount?.takeIf { it > 0 }?.let {
                IllegalStateException("$it sure indirilemedi. Bağlantını kontrol edip tekrar dene.")
            }
        if (failure != null) {
            mutableUiState.update {
                it.copy(downloadState = DownloadState.Idle, error = downloadErrorMessage(failure))
            }
            return
        }

        val cachedSurahCount = cachedSurahCount()
        val loopCached = computeLoopCached(surahIds, reciterId)
        val selectedCached = runCatching {
            audioCacheRepository.isCached(selectedSurahPlaybackAudio())
        }.getOrDefault(false)
        mutableUiState.update {
            it.copy(
                downloadState = DownloadState.Done(successCount = surahIds.size, failureCount = 0),
                isSelectedSurahCached = selectedCached,
                isLoopCached = loopCached,
                cachedSurahCount = cachedSurahCount,
            )
        }
        val current = mutableUiState.value
        if (
            playAfterDownload &&
            current.isLoopMode &&
            current.loopSurahIds == surahIds &&
            current.settings.reciterId == reciterId
        ) {
            start()
        }
    }

    private suspend fun refreshLoopCached() {
        val state = mutableUiState.value
        val cached = computeLoopCached(state.loopSurahIds, state.settings.reciterId)
        mutableUiState.update {
            if (it.loopSurahIds == state.loopSurahIds && it.settings.reciterId == state.settings.reciterId) {
                it.copy(isLoopCached = cached)
            } else {
                it
            }
        }
    }

    private suspend fun computeLoopCached(surahIds: List<Int>, reciterId: Int): Boolean =
        withContext(Dispatchers.IO) {
            surahIds.isNotEmpty() && runCatching {
                quranRepository.playbackAudioForSurahs(surahIds, reciterId)
                    .all { audioCacheRepository.isCached(it) }
            }.getOrDefault(false)
        }

    private fun stopIfSessionStarted() {
        when (mutableUiState.value.sessionState) {
            is PlaybackSessionState.Active, is PlaybackSessionState.PausedByUser -> playbackCoordinator.stop()
            else -> Unit
        }
    }
}
