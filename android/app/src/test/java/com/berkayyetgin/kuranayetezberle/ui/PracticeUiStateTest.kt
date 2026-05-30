package com.berkayyetgin.kuranayetezberle.ui

import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.SurahEntity
import com.berkayyetgin.kuranayetezberle.domain.AyahRange
import com.berkayyetgin.kuranayetezberle.domain.PlaybackSessionState
import org.junit.Assert.assertEquals
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
        val range = AyahRange(1, 1, 3)
        val activeSession = PlaybackSessionState.Active(range, repeatTarget = 10, currentRepeat = 2, activeAyah = 2, speed = 1f)
        val pausedSession = PlaybackSessionState.PausedByUser(activeSession)
        
        val stateActive = PracticeUiState(sessionState = activeSession, restoredActiveAyah = 3)
        val statePaused = PracticeUiState(sessionState = pausedSession, restoredActiveAyah = 3)
        val stateIdle = PracticeUiState(sessionState = PlaybackSessionState.Idle, restoredActiveAyah = 3)

        assertEquals(2, stateActive.activeAyah)
        assertEquals(2, statePaused.activeAyah)
        assertEquals(3, stateIdle.activeAyah)
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
