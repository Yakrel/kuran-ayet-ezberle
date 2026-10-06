package com.berkayyetgin.kuranayetezberle.ui

import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.SurahEntity
import com.berkayyetgin.kuranayetezberle.domain.AyahRange
import com.berkayyetgin.kuranayetezberle.domain.PlaybackSessionState
import org.junit.Assert.assertEquals
import com.berkayyetgin.kuranayetezberle.domain.PracticeTarget
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PracticeUiStateTest {
    @Test
    fun canStartReturnsTrueForValidAyahRange() {
        val ayahs = listOf(
            ayah(number = 1, page = 1),
            ayah(number = 2, page = 1),
            ayah(number = 3, page = 1),
        )
        val surah = SurahEntity(id = 1, name = "Fatihah", verseCount = 3)
        val state = PracticeUiState(
            loading = false,
            ayahs = ayahs,
            selectedSurah = surah,
            startAyah = 1,
            endAyah = 2,
        )

        assertTrue(state.canStart)
    }

    @Test
    fun canStartReturnsFalseWhenLoadingOrMissingSurah() {
        val ayahs = listOf(ayah(number = 1, page = 1))
        val surah = SurahEntity(id = 1, name = "Fatihah", verseCount = 1)
        
        val stateLoading = PracticeUiState(loading = true, ayahs = ayahs, selectedSurah = surah)
        val stateNoSurah = PracticeUiState(loading = false, ayahs = ayahs, selectedSurah = null)

        assertFalse(stateLoading.canStart)
        assertFalse(stateNoSurah.canStart)
    }

    @Test
    fun canStartReturnsFalseForInvalidAyahRange() {
        val ayahs = listOf(
            ayah(number = 1, page = 1),
            ayah(number = 3, page = 1),
        )
        val surah = SurahEntity(id = 1, name = "Fatihah", verseCount = 3)
        
        val stateInvertedRange = PracticeUiState(loading = false, ayahs = ayahs, selectedSurah = surah, startAyah = 3, endAyah = 1)
        val stateMissingAyah = PracticeUiState(loading = false, ayahs = ayahs, selectedSurah = surah, startAyah = 1, endAyah = 2) // Ayah 2 is missing from list

        assertFalse(stateInvertedRange.canStart)
        assertFalse(stateMissingAyah.canStart)
    }

    @Test
    fun activeAyahReturnsCorrectValueBasedOnSessionState() {
        val target = PracticeTarget.Range(AyahRange(1, 1, 3))
        val activeSession = PlaybackSessionState.Active(
            target,
            repeatTarget = 10,
            currentRepeat = 2,
            activeSurahId = 1,
            activeAyah = 2,
            speed = 1f,
        )
        val pausedSession = PlaybackSessionState.PausedByUser(activeSession)
        
        val stateActive = PracticeUiState(sessionState = activeSession, restoredActiveAyah = 3)
        val statePaused = PracticeUiState(sessionState = pausedSession, restoredActiveAyah = 3)
        val stateIdle = PracticeUiState(sessionState = PlaybackSessionState.Idle, restoredActiveAyah = 3)

        assertEquals(2, stateActive.activeAyah)
        assertEquals(2, statePaused.activeAyah)
        assertEquals(3, stateIdle.activeAyah)
    }

    @Test
    fun activeAyahIsHiddenWhilePlayingSurahIsNotTheDisplayedOne() {
        val session = PlaybackSessionState.Active(
            PracticeTarget.Surahs(listOf(113, 114)),
            repeatTarget = 2,
            currentRepeat = 1,
            activeSurahId = 114,
            activeAyah = 3,
            speed = 1f,
        )

        assertNull(PracticeUiState(sessionState = session, selectedSurahId = 113).activeAyah)
        assertEquals(3, PracticeUiState(sessionState = session, selectedSurahId = 114).activeAyah)
    }

    @Test
    fun loopModeCanStartWithoutAyahRangeButNeedsSurahs() {
        val ready = PracticeUiState(loading = false, isLoopMode = true, loopSurahIds = listOf(1, 112))
        val empty = PracticeUiState(loading = false, isLoopMode = true, loopSurahIds = emptyList())

        assertTrue(ready.canStart)
        assertFalse(empty.canStart)
    }

    @Test
    fun loopModeSurahNavigationStaysInsideTheLoop() {
        val loop = listOf(112, 1, 114)

        assertFalse(PracticeUiState(isLoopMode = true, loopSurahIds = loop, selectedSurahId = 112).canSelectPreviousSurah)
        assertTrue(PracticeUiState(isLoopMode = true, loopSurahIds = loop, selectedSurahId = 112).canSelectNextSurah)
        assertTrue(PracticeUiState(isLoopMode = true, loopSurahIds = loop, selectedSurahId = 114).canSelectPreviousSurah)
        assertFalse(PracticeUiState(isLoopMode = true, loopSurahIds = loop, selectedSurahId = 114).canSelectNextSurah)
    }

    private fun ayah(number: Int, page: Int) = AyahWithDetails(
        surahId = 1,
        number = number,
        page = page,
        arabic = "ayah $number",
        transcription = "",
        translation = "",
        fromMs = number * 1_000L,
        toMs = number * 1_000L + 500L,
    )
}
