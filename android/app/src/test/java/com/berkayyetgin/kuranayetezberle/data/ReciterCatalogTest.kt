package com.berkayyetgin.kuranayetezberle.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReciterCatalogTest {
    @Test
    fun defaultReciterPreservesBundledSaadAlGhamdiSource() {
        val default = ReciterCatalog.default

        assertEquals(ReciterCatalog.DEFAULT_RECITER_ID, default.id)
        assertEquals(ReciterPlaybackType.FullSurah, default.playbackType)
        assertTrue(default.recitationAssetPath!!.contains("saad-al-ghamdi"))
    }

    @Test
    fun everyAyahOptionsExposeSourceLabelAndUrlTemplate() {
        val everyAyah = ReciterCatalog.options.filter { it.sourceLabel.startsWith("EveryAyah") }

        assertTrue(everyAyah.isNotEmpty())
        assertTrue(everyAyah.all { it.playbackType == ReciterPlaybackType.AyahFiles })
        assertTrue(everyAyah.all { it.ayahUrlTemplate?.contains("%s") == true })
    }

    @Test
    fun mp3QuranOptionsExposeFullSurahAssets() {
        val mp3Quran = ReciterCatalog.options.filter { it.sourceLabel.startsWith("MP3Quran") }

        assertTrue(mp3Quran.isNotEmpty())
        assertTrue(mp3Quran.all { it.playbackType == ReciterPlaybackType.FullSurah })
        assertTrue(mp3Quran.all { it.recitationAssetPath?.endsWith(".json") == true })
    }

    @Test
    fun ayahAudioFileKeyUsesEveryAyahSixDigitFormat() {
        assertEquals("001007", ayahAudioFileKey(surahId = 1, ayahNumber = 7))
        assertEquals("114006", ayahAudioFileKey(surahId = 114, ayahNumber = 6))
    }
}
