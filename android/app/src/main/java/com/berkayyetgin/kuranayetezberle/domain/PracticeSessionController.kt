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

sealed interface PlaybackSessionState {
    data object Idle : PlaybackSessionState
    data class Active(
        val range: AyahRange,
        val repeatTarget: Int,
        val currentRepeat: Int,
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
        require(repeatTarget in 1..999) { "Repeat count must be between 1 and 999." }
        mutableState.value = PlaybackSessionState.Active(range, repeatTarget, 1, range.startAyah, speed)
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
        val active = mutableState.value as? PlaybackSessionState.Active ?: return
        mutableState.value = active.copy(speed = speed)
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

    fun markPosition(activeAyah: Int) {
        val active = mutableState.value as? PlaybackSessionState.Active ?: return
        mutableState.value = active.copy(activeAyah = activeAyah)
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
                activeAyah = active.range.startAyah,
            )
            RepeatBoundaryResult.Continue
        }
    }
}
