package com.berkayyetgin.kuranayetezberle.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "surah")
data class SurahEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val verseCount: Int,
)

@Entity(
    tableName = "ayah",
    primaryKeys = ["surahId", "number"],
    foreignKeys = [
        ForeignKey(
            entity = SurahEntity::class,
            parentColumns = ["id"],
            childColumns = ["surahId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("surahId"), Index("page")],
)
data class AyahEntity(
    val surahId: Int,
    val number: Int,
    val page: Int,
    val arabic: String,
    val transcription: String,
)

@Entity(
    tableName = "ayah_translation",
    primaryKeys = ["surahId", "ayahNumber", "authorId"],
    indices = [Index("surahId", "ayahNumber")],
)
data class AyahTranslationEntity(
    val surahId: Int,
    val ayahNumber: Int,
    val authorId: String,
    val text: String,
)

@Entity(
    tableName = "ayah_timing",
    primaryKeys = ["surahId", "ayahNumber", "recitationId"],
    indices = [Index("surahId", "ayahNumber")],
)
data class AyahTimingEntity(
    val surahId: Int,
    val ayahNumber: Int,
    val recitationId: Int,
    val fromMs: Long,
    val toMs: Long,
)

@Entity(
    tableName = "reciter_audio",
    primaryKeys = ["surahId", "recitationId"],
)
data class ReciterAudioEntity(
    val surahId: Int,
    val recitationId: Int,
    val url: String,
    val durationSeconds: Long,
    val audioSize: Long,
)

data class RawAyahWithDetails(
    val surahId: Int,
    val number: Int,
    val page: Int,
    val arabic: String,
    val transcription: String,
    val translation: String?,
    val fromMs: Long?,
    val toMs: Long?,
)

data class AyahWithDetails(
    val surahId: Int,
    val number: Int,
    val page: Int,
    val arabic: String,
    val transcription: String,
    val translation: String,
    val fromMs: Long,
    val toMs: Long,
)

data class SurahAudio(
    val surahId: Int,
    val recitationId: Int,
    val url: String,
    val durationSeconds: Long,
    val audioSize: Long,
)

sealed interface PlaybackAudio {
    val reciterId: Int
    val surahId: Int
}

data class FullSurahPlaybackAudio(
    val audio: SurahAudio,
) : PlaybackAudio {
    override val reciterId: Int get() = audio.recitationId
    override val surahId: Int get() = audio.surahId
}

data class AyahAudioSource(
    val reciterId: Int,
    val surahId: Int,
    val ayahNumber: Int,
    val url: String,
)

data class AyahFilesPlaybackAudio(
    override val reciterId: Int,
    override val surahId: Int,
    val ayahs: List<AyahAudioSource>,
) : PlaybackAudio
