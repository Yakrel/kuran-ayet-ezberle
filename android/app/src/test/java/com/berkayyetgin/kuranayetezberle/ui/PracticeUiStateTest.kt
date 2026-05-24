package com.berkayyetgin.kuranayetezberle.ui

import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PracticeUiStateTest {
    @Test
    fun visibleAyahsDoesNotFallbackToWholeSurahWhenPageIsEmpty() {
        val state = PracticeUiState(
            ayahs = listOf(
                ayah(number = 1, page = 1),
                ayah(number = 2, page = 1),
            ),
            selectedPage = 2,
        )

        assertTrue(state.visibleAyahs.isEmpty())
    }

    @Test
    fun visibleAyahsReturnsOnlySelectedPage() {
        val state = PracticeUiState(
            ayahs = listOf(
                ayah(number = 1, page = 1),
                ayah(number = 2, page = 2),
            ),
            selectedPage = 2,
        )

        assertEquals(listOf(2), state.visibleAyahs.map { it.number })
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
