package com.berkayyetgin.kuranayetezberle.domain

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class AyahRange(val surahId: Int, val startAyah: Int, val endAyah: Int) {
    init {
        require(surahId in 1..114) { "Surah must be between 1 and 114." }
        require(startAyah > 0) { "Start ayah must be positive." }
        require(endAyah >= startAyah) { "End ayah must be greater than or equal to start." }
    }
}

/** What a practice session repeats: one ayah range, or whole surahs played back to back. */
sealed interface PracticeTarget {
    val firstSurahId: Int
    val firstAyah: Int

    data class Range(val range: AyahRange) : PracticeTarget {
        override val firstSurahId: Int get() = range.surahId
        override val firstAyah: Int get() = range.startAyah
    }

    /** Whole surahs in play order; the full sequence is one repeat. */
    data class Surahs(val surahIds: List<Int>) : PracticeTarget {
        init {
            require(surahIds.isNotEmpty()) { "At least one surah is required." }
            require(surahIds.all { it in 1..114 }) { "Surah must be between 1 and 114." }
            require(surahIds.distinct().size == surahIds.size) { "Surahs must be unique." }
        }

        override val firstSurahId: Int get() = surahIds.first()
        override val firstAyah: Int get() = 1
    }
}

sealed interface PlaybackSessionState {
    data object Idle : PlaybackSessionState
    data class Active(
        val target: PracticeTarget,
        val repeatTarget: Int,
        val currentRepeat: Int,
        val activeSurahId: Int,
        val activeAyah: Int,
        val speed: Float,
    ) : PlaybackSessionState
    data class PausedByUser(val active: Active) : PlaybackSessionState
    data object Stopped : PlaybackSessionState
    data object Completed : PlaybackSessionState
    data class Error(val message: String) : PlaybackSessionState
}

sealed interface RepeatBoundaryResult {
    data object Continue : RepeatBoundaryResult
    data object Completed : RepeatBoundaryResult
    data object Inactive : RepeatBoundaryResult
}

@Singleton
class PracticeSessionController @Inject constructor() {
    private val mutableState = MutableStateFlow<PlaybackSessionState>(PlaybackSessionState.Idle)
    val state: StateFlow<PlaybackSessionState> = mutableState.asStateFlow()

    fun start(range: AyahRange, repeatTarget: Int, speed: Float) {
        start(PracticeTarget.Range(range), repeatTarget, speed)
    }

    fun start(target: PracticeTarget, repeatTarget: Int, speed: Float) {
        require(repeatTarget in 1..999) { "Repeat count must be between 1 and 999." }
        mutableState.value = PlaybackSessionState.Active(
            target = target,
            repeatTarget = repeatTarget,
            currentRepeat = 1,
            activeSurahId = target.firstSurahId,
            activeAyah = target.firstAyah,
            speed = speed,
        )
    }

    fun pauseByUser() {
        val active = mutableState.value as? PlaybackSessionState.Active ?: return
        mutableState.value = PlaybackSessionState.PausedByUser(active)
    }

    fun resumeFromUserOrRemote(): Boolean {
        val paused = mutableState.value as? PlaybackSessionState.PausedByUser ?: return false
        mutableState.value = paused.active
        return true
    }

    fun onRemotePlay(): Boolean = resumeFromUserOrRemote()

    fun onRemotePause(): Boolean {
        val active = mutableState.value as? PlaybackSessionState.Active ?: return false
        mutableState.value = PlaybackSessionState.PausedByUser(active)
        return true
    }

    fun updateSpeed(speed: Float) {
        when (val current = mutableState.value) {
            is PlaybackSessionState.Active -> {
                mutableState.value = current.copy(speed = speed)
            }
            is PlaybackSessionState.PausedByUser -> {
                mutableState.value = PlaybackSessionState.PausedByUser(current.active.copy(speed = speed))
            }
            else -> Unit
        }
    }

    fun updateRepeatTarget(repeatTarget: Int) {
        require(repeatTarget in 1..999) { "Repeat count must be between 1 and 999." }
        when (val current = mutableState.value) {
            is PlaybackSessionState.Active -> {
                mutableState.value = current.copy(repeatTarget = repeatTarget)
            }
            is PlaybackSessionState.PausedByUser -> {
                mutableState.value = PlaybackSessionState.PausedByUser(current.active.copy(repeatTarget = repeatTarget))
            }
            else -> Unit
        }
    }

    fun stop() {
        mutableState.value = PlaybackSessionState.Stopped
    }

    fun fail(message: String) {
        mutableState.value = PlaybackSessionState.Error(message)
    }

    fun complete() {
        mutableState.value = PlaybackSessionState.Completed
    }

    /** Records the playing ayah; [surahId] is only passed when playback may cross surah boundaries. */
    fun markPosition(activeAyah: Int, surahId: Int? = null) {
        val active = mutableState.value as? PlaybackSessionState.Active ?: return
        mutableState.value = active.copy(
            activeSurahId = surahId ?: active.activeSurahId,
            activeAyah = activeAyah,
        )
    }

    fun finishRangeRepeat(): RepeatBoundaryResult {
        val active = mutableState.value as? PlaybackSessionState.Active
            ?: return RepeatBoundaryResult.Inactive
        return if (active.currentRepeat >= active.repeatTarget) {
            complete()
            RepeatBoundaryResult.Completed
        } else {
            mutableState.value = active.copy(
                currentRepeat = active.currentRepeat + 1,
                activeSurahId = active.target.firstSurahId,
                activeAyah = active.target.firstAyah,
            )
            RepeatBoundaryResult.Continue
        }
    }
}
