package com.berkayyetgin.kuranayetezberle.data

import javax.inject.Inject

class QuranRepository @Inject constructor(
    private val dao: QuranDao,
    private val seeder: AssetQuranSeeder,
) {
    suspend fun surahs(): List<SurahEntity> {
        seeder.seedIfNeeded(dao)
        return dao.surahs()
    }

    suspend fun ayahsForSurah(
        surahId: Int,
        translationAuthorId: String,
        recitationId: Int = 13,
    ): List<AyahWithDetails> {
        seeder.seedIfNeeded(dao)
        val rawAyahs = dao.ayahsForSurah(surahId, translationAuthorId, recitationId)
        val missing = rawAyahs.firstOrNull {
            it.translation.isNullOrBlank() || it.fromMs == null || it.toMs == null || it.toMs <= it.fromMs
        }
        check(missing == null) {
            "Unsupported data: missing translation or timing for $surahId:${missing?.number}"
        }
        return rawAyahs.map {
            AyahWithDetails(
                surahId = it.surahId,
                number = it.number,
                page = it.page,
                arabic = it.arabic,
                transcription = it.transcription,
                translation = it.translation!!,
                fromMs = it.fromMs!!,
                toMs = it.toMs!!,
            )
        }
    }

    suspend fun audioForSurah(surahId: Int, recitationId: Int = 13): SurahAudio {
        seeder.seedIfNeeded(dao)
        val audio = dao.audioForSurah(surahId, recitationId)
        checkNotNull(audio) { "Unsupported data: missing audio for surah $surahId" }
        return SurahAudio(
            surahId = audio.surahId,
            recitationId = audio.recitationId,
            url = audio.url,
            durationSeconds = audio.durationSeconds,
            audioSize = audio.audioSize,
        )
    }
}
