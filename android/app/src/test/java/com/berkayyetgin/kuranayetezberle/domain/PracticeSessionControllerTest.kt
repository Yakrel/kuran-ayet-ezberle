package com.berkayyetgin.kuranayetezberle.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test

class PracticeSessionControllerTest {
    @Test
    fun remotePlayDoesNotStartFromIdleStoppedCompletedOrError() {
        val controller = PracticeSessionController()

        assertFalse(controller.onRemotePlay())

        controller.start(AyahRange(1, 1, 3), repeatTarget = 2, speed = 1f)
        controller.stop()
        assertFalse(controller.onRemotePlay())

        controller.start(AyahRange(1, 1, 3), repeatTarget = 1, speed = 1f)
        controller.complete()
        assertFalse(controller.onRemotePlay())

        controller.fail("Unsupported")
        assertFalse(controller.onRemotePlay())
    }

    @Test
    fun remotePlayResumesOnlyWhenPausedByUser() {
        val controller = PracticeSessionController()
        controller.start(AyahRange(2, 100, 105), repeatTarget = 20, speed = 1.25f)
        controller.pauseByUser()

        assertTrue(controller.onRemotePlay())
        assertFalse(controller.onRemotePlay())
    }

    @Test
    fun repeatCompletionClosesSessionAtTarget() {
        val controller = PracticeSessionController()
        controller.start(AyahRange(112, 1, 4), repeatTarget = 2, speed = 1f)

        assertEquals(RepeatBoundaryResult.Continue, controller.finishRangeRepeat())
        assertEquals(RepeatBoundaryResult.Completed, controller.finishRangeRepeat())
        assertFalse(controller.onRemotePlay())
    }

    @Test
    fun repeatContinuationAdvancesCountAndResetsActiveAyahToRangeStart() {
        val controller = PracticeSessionController()
        controller.start(AyahRange(2, 4, 8), repeatTarget = 3, speed = 1f)
        controller.markPosition(7)

        assertEquals(RepeatBoundaryResult.Continue, controller.finishRangeRepeat())

        val active = controller.state.value as PlaybackSessionState.Active
        assertEquals(2, active.currentRepeat)
        assertEquals(4, active.activeAyah)
    }

    @Test
    fun repeatBoundaryIsInactiveWhenSessionIsNotActive() {
        val controller = PracticeSessionController()

        assertEquals(RepeatBoundaryResult.Inactive, controller.finishRangeRepeat())

        controller.start(AyahRange(1, 1, 3), repeatTarget = 2, speed = 1f)
        controller.pauseByUser()

        assertEquals(RepeatBoundaryResult.Inactive, controller.finishRangeRepeat())
    }

    @Test
    fun remotePauseMarksActiveSessionAsPausedByUser() {
        val controller = PracticeSessionController()
        controller.start(AyahRange(2, 100, 105), repeatTarget = 20, speed = 1.25f)

        assertTrue(controller.onRemotePause())
        assertTrue(controller.state.value is PlaybackSessionState.PausedByUser)
        assertTrue(controller.onRemotePlay())
    }

    @Test
    fun updateRepeatTargetDynamicallyModifiesActiveAndPausedSessions() {
        val controller = PracticeSessionController()
        controller.start(AyahRange(2, 100, 105), repeatTarget = 20, speed = 1.25f)

        controller.updateRepeatTarget(30)
        val activeState = controller.state.value as PlaybackSessionState.Active
        assertEquals(30, activeState.repeatTarget)

        controller.pauseByUser()
        controller.updateRepeatTarget(45)
        val pausedState = controller.state.value as PlaybackSessionState.PausedByUser
        assertEquals(45, pausedState.active.repeatTarget)
    }

    @Test
    fun updateSpeedModifiesActiveAndPausedSessions() {
        val controller = PracticeSessionController()
        controller.start(AyahRange(2, 100, 105), repeatTarget = 20, speed = 1f)

        controller.updateSpeed(1.25f)
        val activeState = controller.state.value as PlaybackSessionState.Active
        assertEquals(1.25f, activeState.speed, 0f)

        controller.pauseByUser()
        controller.updateSpeed(1.5f)
        val pausedState = controller.state.value as PlaybackSessionState.PausedByUser
        assertEquals(1.5f, pausedState.active.speed, 0f)
    }

    @Test
    fun surahLoopRepeatRestartsFromFirstSurahAndCompletesAtTarget() {
        val controller = PracticeSessionController()
        controller.start(PracticeTarget.Surahs(listOf(1, 113, 114)), repeatTarget = 2, speed = 1f)
        controller.markPosition(3, surahId = 114)

        val playing = controller.state.value as PlaybackSessionState.Active
        assertEquals(114, playing.activeSurahId)
        assertEquals(3, playing.activeAyah)

        assertEquals(RepeatBoundaryResult.Continue, controller.finishRangeRepeat())
        val restarted = controller.state.value as PlaybackSessionState.Active
        assertEquals(2, restarted.currentRepeat)
        assertEquals(1, restarted.activeSurahId)
        assertEquals(1, restarted.activeAyah)

        assertEquals(RepeatBoundaryResult.Completed, controller.finishRangeRepeat())
    }

    @Test
    fun markPositionWithoutSurahKeepsTheActiveSurah() {
        val controller = PracticeSessionController()
        controller.start(PracticeTarget.Surahs(listOf(113, 114)), repeatTarget = 1, speed = 1f)
        controller.markPosition(2, surahId = 114)
        controller.markPosition(4)

        val active = controller.state.value as PlaybackSessionState.Active
        assertEquals(114, active.activeSurahId)
        assertEquals(4, active.activeAyah)
    }

    @Test
    fun surahTargetRejectsEmptyDuplicateAndUnknownSurahs() {
        assertThrows(IllegalArgumentException::class.java) { PracticeTarget.Surahs(emptyList()) }
        assertThrows(IllegalArgumentException::class.java) { PracticeTarget.Surahs(listOf(1, 1)) }
        assertThrows(IllegalArgumentException::class.java) { PracticeTarget.Surahs(listOf(115)) }
    }
}
