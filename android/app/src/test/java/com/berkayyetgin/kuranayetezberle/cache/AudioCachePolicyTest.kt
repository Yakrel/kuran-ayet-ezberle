package com.berkayyetgin.kuranayetezberle.cache

import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AudioCachePolicyTest {
    private val audio = SurahAudio(
        surahId = 2,
        recitationId = 13,
        url = "https://example.test/002.mp3",
        durationSeconds = 7054,
        audioSize = 8L,
    )

    @Test
    fun validCacheRequiresExpectedSizeWhenMetadataIsKnown() {
        withTempDir { dir ->
            val file = File(dir, "13-2.mp3")
            file.writeBytes(ByteArray(8))

            assertTrue(AudioCachePolicy.isValidCachedAudio(file, audio))
        }
    }

    @Test
    fun zeroByteAndPartialCacheAreInvalid() {
        withTempDir { dir ->
            val empty = File(dir, "empty.mp3").also { it.writeBytes(ByteArray(0)) }
            val partial = File(dir, "partial.mp3").also { it.writeBytes(ByteArray(4)) }

            assertFalse(AudioCachePolicy.isValidCachedAudio(empty, audio))
            assertFalse(AudioCachePolicy.isValidCachedAudio(partial, audio))
        }
    }

    @Test
    fun unknownExpectedSizeAcceptsAnyNonEmptyFile() {
        withTempDir { dir ->
            val file = File(dir, "13-2.mp3")
            file.writeBytes(ByteArray(4))

            assertTrue(AudioCachePolicy.isValidCachedAudio(file, audio.copy(audioSize = 0L)))
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
        val dir = createTempDir(prefix = "audio-cache-policy")
        try {
            block(dir)
        } finally {
            dir.deleteRecursively()
        }
    }
}
