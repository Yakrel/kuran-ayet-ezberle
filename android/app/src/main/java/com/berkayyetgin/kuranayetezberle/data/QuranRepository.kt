package com.berkayyetgin.kuranayetezberle.data

import javax.inject.Inject
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class QuranRepository @Inject constructor(
    private val dao: QuranDao,
    private val seeder: AssetQuranSeeder,
) {
    private val initMutex = Mutex()
    @Volatile private var initialized = false

    suspend fun initialize() {
        if (initialized) return
        initMutex.withLock {
            if (initialized) return
            seeder.seedIfNeeded(dao)
            initialized = true
        }
    }

    suspend fun surahs(): List<SurahEntity> {
        initialize()
        return dao.surahs()
    }

    fun reciters(): List<ReciterOption> = ReciterCatalog.options

    fun reciterById(id: Int): ReciterOption = ReciterCatalog.byId(id)

    suspend fun ayahsForSurah(
        surahId: Int,
        translationAuthorId: String,
        reciterId: Int = ReciterCatalog.DEFAULT_RECITER_ID,
    ): List<AyahWithDetails> {
        initialize()
        val reciter = ReciterCatalog.byId(reciterId)
        val timingRecitationId = when (reciter.playbackType) {
            ReciterPlaybackType.FullSurah -> reciter.id
            ReciterPlaybackType.AyahFiles -> ReciterCatalog.DEFAULT_RECITER_ID
        }
        val rawAyahs = dao.ayahsForSurah(surahId, translationAuthorId, timingRecitationId)
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

    suspend fun audioForSurah(surahId: Int, recitationId: Int = ReciterCatalog.DEFAULT_RECITER_ID): SurahAudio {
        initialize()
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

    suspend fun playbackAudioForRange(
        surahId: Int,
        startAyah: Int,
        endAyah: Int,
        reciterId: Int,
    ): PlaybackAudio {
        initialize()
        val reciter = ReciterCatalog.byId(reciterId)
        return when (reciter.playbackType) {
            ReciterPlaybackType.FullSurah -> FullSurahPlaybackAudio(audioForSurah(surahId, reciter.id))
            ReciterPlaybackType.AyahFiles -> {
                val template = reciter.ayahUrlTemplate
                    ?: error("Unsupported data: missing ayah audio template for ${reciter.label}.")
                AyahFilesPlaybackAudio(
                    reciterId = reciter.id,
                    surahId = surahId,
                    ayahs = (startAyah..endAyah).map { ayahNumber ->
                        val key = ayahAudioFileKey(surahId, ayahNumber)
                        AyahAudioSource(
                            reciterId = reciter.id,
                            surahId = surahId,
                            ayahNumber = ayahNumber,
                            url = template.replace("%s", key),
                        )
                    },
                )
            }
        }
    }
}
