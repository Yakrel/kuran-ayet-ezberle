package com.berkayyetgin.kuranayetezberle.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
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
}
