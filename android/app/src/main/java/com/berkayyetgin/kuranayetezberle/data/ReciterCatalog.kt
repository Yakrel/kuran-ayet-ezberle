package com.berkayyetgin.kuranayetezberle.data

enum class ReciterPlaybackType {
    FullSurah,
    AyahFiles,
}

data class ReciterOption(
    val id: Int,
    val displayName: String,
    val sourceLabel: String,
    val playbackType: ReciterPlaybackType,
    val recitationAssetPath: String? = null,
    val ayahUrlTemplate: String? = null,
) {
    val label: String get() = "$displayName - $sourceLabel"
}

object ReciterCatalog {
    const val DEFAULT_RECITER_ID = 13

    val options: List<ReciterOption> = listOf(
        ReciterOption(
            id = 13,
            displayName = "Saad Al-Ghamdi",
            sourceLabel = "Tarteel · Tam Sure",
            playbackType = ReciterPlaybackType.FullSurah,
            recitationAssetPath = "data/recitations/saad-al-ghamdi-recitation-13.json",
        ),
        ReciterOption(
            id = 4,
            displayName = "Ebu Bekir es-Şatri",
            sourceLabel = "MP3Quran · Tam Sure",
            playbackType = ReciterPlaybackType.FullSurah,
            recitationAssetPath = "data/recitations/abu-bakr-ash-shatri-recitation-4.json",
        ),
        ReciterOption(
            id = 46,
            displayName = "Salah Bukhatir",
            sourceLabel = "MP3Quran · Tam Sure",
            playbackType = ReciterPlaybackType.FullSurah,
            recitationAssetPath = "data/recitations/salah-bukhatir-recitation-46.json",
        ),
        ReciterOption(
            id = 53,
            displayName = "Abdulbasit Abdussamed",
            sourceLabel = "MP3Quran · Tam Sure",
            playbackType = ReciterPlaybackType.FullSurah,
            recitationAssetPath = "data/recitations/abdulbasit-abdussamad-recitation-53.json",
        ),
        ReciterOption(
            id = 60,
            displayName = "Abdullah Basfar",
            sourceLabel = "MP3Quran · Tam Sure",
            playbackType = ReciterPlaybackType.FullSurah,
            recitationAssetPath = "data/recitations/abdullah-basfar-recitation-60.json",
        ),
        ReciterOption(
            id = 123,
            displayName = "Misari Rasid el-Afasi",
            sourceLabel = "MP3Quran · Tam Sure",
            playbackType = ReciterPlaybackType.FullSurah,
            recitationAssetPath = "data/recitations/mishari-alafasy-recitation-123.json",
        ),
        ReciterOption(
            id = 1001,
            displayName = "Halil Husari",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Husary_64kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1002,
            displayName = "Abdulbasit Abdussamed",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1003,
            displayName = "Eymen Suveyd",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Ayman_Sowaid_64kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1004,
            displayName = "Mahir el-Muaykili",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Maher_AlMuaiqly_64kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1005,
            displayName = "Misari Rasid el-Afasi",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Alafasy_64kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1006,
            displayName = "Muhammed Siddik Minsavi",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Minshawy_Murattal_128kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1007,
            displayName = "Abdullah Basfar",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Abdullah_Basfar_64kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1008,
            displayName = "Muhammed Jibreel",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Muhammad_Jibreel_64kbps/%s.mp3",
        ),
        ReciterOption(
            id = 1009,
            displayName = "Salah Bukhatir",
            sourceLabel = "EveryAyah · Ayet Ayet",
            playbackType = ReciterPlaybackType.AyahFiles,
            ayahUrlTemplate = "https://everyayah.com/data/Salaah_AbdulRahman_Bukhatir_128kbps/%s.mp3",
        ),
    )

    fun byId(id: Int): ReciterOption =
        options.firstOrNull { it.id == id } ?: default

    val default: ReciterOption
        get() = options.first { it.id == DEFAULT_RECITER_ID }
}

fun ayahAudioFileKey(surahId: Int, ayahNumber: Int): String =
    "%03d%03d".format(surahId, ayahNumber)
