package com.berkayyetgin.kuranayetezberle.cache

import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import java.io.File

object AudioCachePolicy {
    fun tempFileFor(target: File): File = File(target.parentFile, "${target.name}.tmp")

    fun isValidCachedAudio(file: File, audio: SurahAudio): Boolean {
        if (!file.exists() || !file.isFile) return false
        val length = file.length()
        if (length <= 0L) return false
        return audio.audioSize <= 0L || length == audio.audioSize
    }
}
