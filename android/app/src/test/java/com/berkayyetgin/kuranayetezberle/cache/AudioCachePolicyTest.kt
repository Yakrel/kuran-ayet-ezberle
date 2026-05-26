package com.berkayyetgin.kuranayetezberle.cache

import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import java.io.File
import kotlin.io.path.createTempDirectory
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AudioCachePolicyTest {
    private val audio = SurahAudio(
        surahId = 2,
        recitationId = 13,
        url = "https://example.test/002.mp3",
        durationSeconds = 7054,
        audioSize = 60 * 1024L, // 60 KB, larger than MIN_VALID_SIZE_BYTES (50 KB)
    )

    @Test
    fun validCacheAcceptsDownloadedAudioEvenWhenMetadataSizeDrifts() {
        withTempDir { dir ->
            val file = File(dir, "13-2.mp3")
            file.writeBytes(ByteArray(60 * 1024))

            assertTrue(AudioCachePolicy.isValidCachedAudio(file, audio.copy(audioSize = 120 * 1024L)))
        }
    }

    @Test
    fun zeroByteAndPartialCacheAreInvalid() {
        withTempDir { dir ->
            val empty = File(dir, "empty.mp3").also { it.writeBytes(ByteArray(0)) }
            val partial = File(dir, "partial.mp3").also { it.writeBytes(ByteArray(40 * 1024)) }

            assertFalse(AudioCachePolicy.isValidCachedAudio(empty, audio))
            assertFalse(AudioCachePolicy.isValidCachedAudio(partial, audio))
        }
    }

    @Test
    fun unknownExpectedSizeAcceptsAnyNonEmptyFile() {
        withTempDir { dir ->
            val file = File(dir, "13-2.mp3")
            file.writeBytes(ByteArray(60 * 1024))

            assertTrue(AudioCachePolicy.isValidCachedAudio(file, audio.copy(audioSize = 0L)))
        }
    }

    @Test
    fun completeDownloadUsesHttpContentLengthWhenKnown() {
        withTempDir { dir ->
            val complete = File(dir, "complete.mp3").also { it.writeBytes(ByteArray(60 * 1024)) }
            val short = File(dir, "short.mp3").also { it.writeBytes(ByteArray(55 * 1024)) }

            assertTrue(AudioCachePolicy.isCompleteDownloadedAudio(complete, expectedBytes = 60 * 1024L))
            assertFalse(AudioCachePolicy.isCompleteDownloadedAudio(short, expectedBytes = 60 * 1024L))
        }
    }

    @Test
    fun tempFileUsesFinalFileNameWithTmpSuffix() {
        withTempDir { dir ->
            val target = File(dir, "13-2.mp3")

            assertTrue(AudioCachePolicy.tempFileFor(target).name.endsWith(".mp3.tmp"))
        }
    }

    private fun withTempDir(block: (File) -> Unit) {
        val dir = createTempDirectory(prefix = "audio-cache-policy").toFile()
        try {
            block(dir)
        } finally {
            dir.deleteRecursively()
        }
    }
}
