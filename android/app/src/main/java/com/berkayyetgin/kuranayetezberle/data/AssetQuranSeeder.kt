package com.berkayyetgin.kuranayetezberle.data

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromStream

class AssetQuranSeeder @Inject constructor(
    @ApplicationContext private val context: Context,
    private val json: Json,
) {
    private val seedMutex = Mutex()
    @Volatile private var seeded = false

    suspend fun seedIfNeeded(dao: QuranDao) {
        if (seeded) return
        seedMutex.withLock {
            if (seeded) return
            withContext(Dispatchers.IO) {
                if (dao.surahCount() == 0) {
                    dao.seed(loadSeed())
                }
                seeded = true
            }
        }
    }

    @OptIn(ExperimentalSerializationApi::class)
    private fun loadSeed(): QuranSeed {
        val quran = context.assets.open("data/quran.json").use { input ->
            json.decodeFromStream(QuranJson.serializer(), input)
        }
        val recitation = context.assets.open("data/recitations/saad-al-ghamdi-recitation-13.json")
            .use { input -> json.decodeFromStream(RecitationJson.serializer(), input) }
        val pagesByVerseKey = recitation.surahs
            .flatMap { it.verses }
            .associate { verse ->
                verse.verseKey to QuranPagePolicy.requireValidPage(verse.pageNumber, verse.verseKey)
            }

        val surahs = quran.surahs.map { SurahEntity(it.id, it.name, it.verseCount) }
        val ayahs = quran.surahs.flatMap { surah ->
            surah.verses.map { verse ->
                val verseKey = "${surah.id}:${verse.verseNumber}"
                AyahEntity(
                    surahId = surah.id,
                    number = verse.verseNumber,
                    page = pagesByVerseKey[verseKey]
                        ?: error("Unsupported data: missing page metadata for $verseKey."),
                    arabic = verse.verse,
                    transcription = verse.transcription.orEmpty(),
                )
            }
        }
        val translations = quran.surahs.flatMap { surah ->
            surah.verses.flatMap { verse ->
                verse.translations.map { (authorId, text) ->
                    AyahTranslationEntity(surah.id, verse.verseNumber, authorId, text)
                }
            }
        }
        val audio = recitation.surahs.map { surah ->
            ReciterAudioEntity(
                surahId = surah.id,
                recitationId = recitation.recitationId,
                url = surah.audio.url,
                durationSeconds = surah.audio.duration,
                audioSize = surah.audio.audioSize,
            )
        }
        val timings = recitation.surahs.flatMap { surah ->
            surah.verses.map { verse ->
                val ayahNumber = verse.verseKey.substringAfter(":").toInt()
                AyahTimingEntity(
                    surahId = surah.id,
                    ayahNumber = ayahNumber,
                    recitationId = recitation.recitationId,
                    fromMs = verse.timing.timeFrom,
                    toMs = verse.timing.timeTo,
                )
            }
        }
        return QuranSeed(surahs, ayahs, translations, audio, timings)
    }
}

@Serializable
private data class QuranJson(val surahs: List<QuranSurahJson>)

@Serializable
private data class QuranSurahJson(
    val id: Int,
    val name: String,
    @SerialName("verse_count") val verseCount: Int,
    val verses: List<QuranVerseJson>,
)

@Serializable
private data class QuranVerseJson(
    @SerialName("verse_number") val verseNumber: Int,
    val verse: String,
    val translations: Map<String, String>,
    val transcription: String? = null,
)

@Serializable
private data class RecitationJson(
    @SerialName("recitation_id") val recitationId: Int,
    val surahs: List<RecitationSurahJson>,
)

@Serializable
private data class RecitationSurahJson(
    val id: Int,
    val audio: RecitationAudioJson,
    val verses: List<RecitationVerseJson>,
)

@Serializable
private data class RecitationAudioJson(
    val url: String,
    val duration: Long,
    @SerialName("audio_size") val audioSize: Long,
)

@Serializable
private data class RecitationVerseJson(
    @SerialName("verse_key") val verseKey: String,
    @SerialName("page_number") val pageNumber: Int,
    val timing: RecitationTimingJson,
)

@Serializable
private data class RecitationTimingJson(
    @SerialName("time_from") val timeFrom: Long,
    @SerialName("time_to") val timeTo: Long,
)
