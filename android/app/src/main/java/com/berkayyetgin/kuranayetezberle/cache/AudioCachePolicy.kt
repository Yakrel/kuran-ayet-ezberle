package com.berkayyetgin.kuranayetezberle.cache

import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import java.io.File

object AudioCachePolicy {
    /**
     * Minimum byte threshold to consider a cached file valid.
     * Prevents accepting empty, zero-byte, or severely truncated downloads as legitimate cache hits.
     */
    private const val MIN_VALID_SIZE_BYTES = 50 * 1024L // 50 KB

    fun tempFileFor(target: File): File = File(target.parentFile, "${target.name}.tmp")

    fun isValidCachedAudio(file: File, audio: SurahAudio): Boolean {
        if (!file.exists() || !file.isFile) return false
        val length = file.length()
        return length >= MIN_VALID_SIZE_BYTES
    }

    fun isCompleteDownloadedAudio(file: File, expectedBytes: Long?): Boolean {
        if (!file.exists() || !file.isFile) return false
        val length = file.length()
        if (length < MIN_VALID_SIZE_BYTES) return false
        return expectedBytes == null || length == expectedBytes
    }
}
