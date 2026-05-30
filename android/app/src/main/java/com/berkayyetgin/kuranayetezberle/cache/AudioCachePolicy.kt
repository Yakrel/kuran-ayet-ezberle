package com.berkayyetgin.kuranayetezberle.cache

import com.berkayyetgin.kuranayetezberle.data.AyahAudioSource
import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import java.io.File

object AudioCachePolicy {
    /**
     * Minimum byte threshold to consider a cached file valid.
     * Prevents accepting empty, zero-byte, or severely truncated downloads as legitimate cache hits.
     */
    private const val MIN_VALID_SIZE_BYTES = 50 * 1024L // 50 KB
    private const val MIN_VALID_AYAH_SIZE_BYTES = 8 * 1024L // 8 KB

    fun tempFileFor(target: File): File = File(target.parentFile, "${target.name}.tmp")

    fun cacheFileName(audio: SurahAudio): String =
        "${audio.recitationId}-${audio.surahId}.mp3"

    fun cacheFileName(audio: AyahAudioSource): String =
        "${audio.reciterId}-${audio.surahId}-${audio.ayahNumber}.mp3"

    fun isValidCachedAudio(file: File, audio: SurahAudio): Boolean {
        if (!file.exists() || !file.isFile) return false
        val length = file.length()
        return length >= MIN_VALID_SIZE_BYTES
    }

    fun isValidCachedAyahAudio(file: File): Boolean {
        if (!file.exists() || !file.isFile) return false
        return file.length() >= MIN_VALID_AYAH_SIZE_BYTES
    }

    fun isCompleteDownloadedAudio(file: File, expectedBytes: Long?): Boolean {
        if (!file.exists() || !file.isFile) return false
        val length = file.length()
        if (length < MIN_VALID_SIZE_BYTES) return false
        return expectedBytes == null || length == expectedBytes
    }

    fun isCompleteDownloadedAyahAudio(file: File, expectedBytes: Long?): Boolean {
        if (!file.exists() || !file.isFile) return false
        val length = file.length()
        if (length < MIN_VALID_AYAH_SIZE_BYTES) return false
        return expectedBytes == null || length == expectedBytes
    }
}
