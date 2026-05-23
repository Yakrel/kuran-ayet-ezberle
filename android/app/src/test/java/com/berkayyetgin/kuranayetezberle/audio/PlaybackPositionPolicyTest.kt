package com.berkayyetgin.kuranayetezberle.audio

import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PlaybackPositionPolicyTest {
    @Test
    fun findsActiveAyahByPosition() {
        val ayahs = listOf(
            ayah(number = 100, page = 15, fromMs = 1_000, toMs = 2_000),
            ayah(number = 101, page = 15, fromMs = 2_000, toMs = 3_000),
            ayah(number = 102, page = 16, fromMs = 3_000, toMs = 4_000),
        )

        assertEquals(100, PlaybackPositionPolicy.ayahAt(ayahs, 1_500)?.number)
        assertEquals(101, PlaybackPositionPolicy.ayahAt(ayahs, 2_000)?.number)
        assertEquals(102, PlaybackPositionPolicy.ayahAt(ayahs, 3_999)?.number)
    }

    @Test
    fun returnsNullOutsideKnownTiming() {
        val ayahs = listOf(
            ayah(number = 100, page = 15, fromMs = 1_000, toMs = 2_000),
            ayah(number = 101, page = 15, fromMs = 2_500, toMs = 3_000),
        )

        assertNull(PlaybackPositionPolicy.ayahAt(ayahs, 999))
        assertNull(PlaybackPositionPolicy.ayahAt(ayahs, 2_250))
        assertNull(PlaybackPositionPolicy.ayahAt(ayahs, 3_000))
    }

    private fun ayah(number: Int, page: Int, fromMs: Long, toMs: Long) = AyahWithDetails(
        surahId = 2,
        number = number,
        page = page,
        arabic = "ayah $number",
        transcription = "",
        translation = "",
        fromMs = fromMs,
        toMs = toMs,
    )
}
