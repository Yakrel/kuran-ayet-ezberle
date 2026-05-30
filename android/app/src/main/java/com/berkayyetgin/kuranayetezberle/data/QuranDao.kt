package com.berkayyetgin.kuranayetezberle.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface QuranDao {
    @Query("SELECT COUNT(*) FROM surah")
    suspend fun surahCount(): Int

    @Query("SELECT COUNT(*) FROM reciter_audio WHERE recitationId = :recitationId")
    suspend fun audioCountForRecitation(recitationId: Int): Int

    @Query("SELECT COUNT(*) FROM ayah_timing WHERE recitationId = :recitationId")
    suspend fun timingCountForRecitation(recitationId: Int): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSurahs(items: List<SurahEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAyahs(items: List<AyahEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTranslations(items: List<AyahTranslationEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTimings(items: List<AyahTimingEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAudio(items: List<ReciterAudioEntity>)

    @Query("SELECT * FROM surah ORDER BY id")
    suspend fun surahs(): List<SurahEntity>

    @Query(
        """
        SELECT a.surahId, a.number, a.page, a.arabic, a.transcription,
               tr.text AS translation, t.fromMs, t.toMs
        FROM ayah a
        LEFT JOIN ayah_translation tr
          ON tr.surahId = a.surahId AND tr.ayahNumber = a.number AND tr.authorId = :authorId
        LEFT JOIN ayah_timing t
          ON t.surahId = a.surahId AND t.ayahNumber = a.number AND t.recitationId = :recitationId
        WHERE a.surahId = :surahId
        ORDER BY a.number
        """,
    )
    suspend fun ayahsForSurah(surahId: Int, authorId: String, recitationId: Int): List<RawAyahWithDetails>

    @Query("SELECT * FROM reciter_audio WHERE surahId = :surahId AND recitationId = :recitationId")
    suspend fun audioForSurah(surahId: Int, recitationId: Int): ReciterAudioEntity?

    @Transaction
    suspend fun seed(seed: QuranSeed) {
        insertSurahs(seed.surahs)
        insertAyahs(seed.ayahs)
        insertTranslations(seed.translations)
        insertAudio(seed.audio)
        insertTimings(seed.timings)
    }
}

data class QuranSeed(
    val surahs: List<SurahEntity>,
    val ayahs: List<AyahEntity>,
    val translations: List<AyahTranslationEntity>,
    val audio: List<ReciterAudioEntity>,
    val timings: List<AyahTimingEntity>,
)
