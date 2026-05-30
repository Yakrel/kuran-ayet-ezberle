package com.berkayyetgin.kuranayetezberle.cache

import android.content.Context
import com.berkayyetgin.kuranayetezberle.data.AyahAudioSource
import com.berkayyetgin.kuranayetezberle.data.AyahFilesPlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.FullSurahPlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.PlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.atomic.AtomicInteger
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

@Singleton
class AudioCacheRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val client: OkHttpClient,
) {
    private val cacheDir: File
        get() = File(context.filesDir, "surah-audio").also { it.mkdirs() }

    fun cachedFile(audio: SurahAudio): File =
        File(cacheDir, AudioCachePolicy.cacheFileName(audio))

    fun cachedFile(audio: AyahAudioSource): File =
        File(cacheDir, AudioCachePolicy.cacheFileName(audio))

    /** Returns true when the surah audio is fully downloaded and passes validation. */
    fun isCached(audio: SurahAudio): Boolean =
        AudioCachePolicy.isValidCachedAudio(cachedFile(audio), audio)

    fun isCached(audio: AyahAudioSource): Boolean =
        AudioCachePolicy.isValidCachedAyahAudio(cachedFile(audio))

    fun isCached(audio: PlaybackAudio): Boolean = when (audio) {
        is FullSurahPlaybackAudio -> isCached(audio.audio)
        is AyahFilesPlaybackAudio -> audio.ayahs.all { isCached(it) }
    }

    /**
     * Returns the local file URI when the surah is fully cached, or the remote URL for network
     * streaming when it is not. Any stale or partial local file is cleaned up before returning
     * the network URL.
     *
     * **Important:** Callers must surface the streaming vs. cached state to the user via [isCached].
     * Never use this in a silent fallback path — the UI must indicate whether audio is being
     * streamed or played from local cache.
     */
    fun resolvePlaybackUri(audio: SurahAudio): String {
        val cached = cachedFile(audio)
        return if (AudioCachePolicy.isValidCachedAudio(cached, audio)) {
            cached.toURI().toString()
        } else {
            // Delete any corrupt / partial file so that a fresh download can succeed later.
            if (cached.exists()) cached.delete()
            audio.url
        }
    }

    fun resolvePlaybackUri(audio: AyahAudioSource): String {
        val cached = cachedFile(audio)
        return if (AudioCachePolicy.isValidCachedAyahAudio(cached)) {
            cached.toURI().toString()
        } else {
            if (cached.exists()) cached.delete()
            audio.url
        }
    }

    /** Downloads a single surah and returns the local file. Skips the network if already cached. */
    suspend fun download(
        audio: SurahAudio,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)? = null,
    ): File = withContext(Dispatchers.IO) {
        val target = cachedFile(audio)
        if (AudioCachePolicy.isValidCachedAudio(target, audio)) return@withContext target
        if (target.exists()) target.delete()
        val temp = AudioCachePolicy.tempFileFor(target)
        if (temp.exists()) temp.delete()
        val request = Request.Builder().url(audio.url).build()
        try {
            client.executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    error("Ses dosyası indirilemedi (HTTP ${response.code}).")
                }
                val body = response.body ?: error("Ses dosyası boş döndü.")
                val expectedBytes = body.contentLength().takeIf { it > 0L }
                body.byteStream().use { input ->
                    temp.outputStream().use { output ->
                        input.copyToWithProgress(output, expectedBytes, onProgress)
                    }
                }
                check(AudioCachePolicy.isCompleteDownloadedAudio(temp, expectedBytes)) {
                    "Ses dosyası eksik indi. Bağlantını kontrol edip tekrar dene."
                }
            }
            check(temp.renameTo(target)) { "Ses dosyası kaydedilemedi." }
            target
        } catch (error: Throwable) {
            temp.delete()
            throw error
        }
    }

    suspend fun download(
        audio: AyahAudioSource,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)? = null,
    ): File = withContext(Dispatchers.IO) {
        val target = cachedFile(audio)
        if (AudioCachePolicy.isValidCachedAyahAudio(target)) return@withContext target
        if (target.exists()) target.delete()
        val temp = AudioCachePolicy.tempFileFor(target)
        if (temp.exists()) temp.delete()
        val request = Request.Builder().url(audio.url).build()
        try {
            client.executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    error("Ayet ses dosyası indirilemedi (HTTP ${response.code}).")
                }
                val body = response.body ?: error("Ayet ses dosyası boş döndü.")
                val expectedBytes = body.contentLength().takeIf { it > 0L }
                body.byteStream().use { input ->
                    temp.outputStream().use { output ->
                        input.copyToWithProgress(output, expectedBytes, onProgress)
                    }
                }
                check(AudioCachePolicy.isCompleteDownloadedAyahAudio(temp, expectedBytes)) {
                    "Ayet ses dosyası eksik indi. Bağlantını kontrol edip tekrar dene."
                }
            }
            check(temp.renameTo(target)) { "Ayet ses dosyası kaydedilemedi." }
            target
        } catch (error: Throwable) {
            temp.delete()
            throw error
        }
    }

    suspend fun download(
        audio: PlaybackAudio,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)? = null,
        onItemCompleted: ((completedCount: Int, totalCount: Int) -> Unit)? = null,
    ) {
        when (audio) {
            is FullSurahPlaybackAudio -> download(audio.audio, onProgress)
            is AyahFilesPlaybackAudio -> coroutineScope {
                val total = audio.ayahs.size
                val completed = AtomicInteger(0)
                val limiter = Semaphore(permits = 4)
                audio.ayahs.map { ayahAudio ->
                    async(Dispatchers.IO) {
                        limiter.withPermit { download(ayahAudio) }
                        onItemCompleted?.invoke(completed.incrementAndGet(), total)
                    }
                }.awaitAll()
            }
        }
    }


    /**
     * Downloads all [items] with at most 4 parallel connections.
     *
     * Each item is **independently error-isolated**: a failure for one surah does not cancel
     * the remaining downloads. Returns a [DownloadAllResult] with the per-outcome counts so the
     * caller can surface partial-success information to the user.
     */
    suspend fun downloadAll(
        items: List<SurahAudio>,
        onItemCompleted: ((completedCount: Int, totalCount: Int) -> Unit)? = null,
    ): DownloadAllResult = coroutineScope {
        val limiter = Semaphore(permits = 4)
        val completed = AtomicInteger(0)
        val results = items.map { audio ->
            async(Dispatchers.IO) {
                limiter.withPermit {
                    runCatching { download(audio) }
                        .also { onItemCompleted?.invoke(completed.incrementAndGet(), items.size) }
                }
            }
        }.awaitAll()
        DownloadAllResult(
            successCount = results.count { it.isSuccess },
            failureCount = results.count { it.isFailure },
        )
    }

    suspend fun downloadAllPlayback(
        items: List<PlaybackAudio>,
        onItemCompleted: ((completedCount: Int, totalCount: Int) -> Unit)? = null,
    ): DownloadAllResult = coroutineScope {
        val limiter = Semaphore(permits = 4)
        val completed = AtomicInteger(0)
        val results = items.map { audio ->
            async(Dispatchers.IO) {
                limiter.withPermit {
                    runCatching { download(audio) }
                        .also { onItemCompleted?.invoke(completed.incrementAndGet(), items.size) }
                }
            }
        }.awaitAll()
        DownloadAllResult(
            successCount = results.count { it.isSuccess },
            failureCount = results.count { it.isFailure },
        )
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        cacheDir.listFiles()?.forEach { it.delete() }
    }

    private suspend fun OkHttpClient.executeCancellable(request: Request): Response =
        suspendCancellableCoroutine { continuation ->
            val call = newCall(request)
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (!continuation.isCancelled) continuation.resumeWithException(e)
                }

                override fun onResponse(call: Call, response: Response) {
                    if (!continuation.isCancelled) {
                        continuation.resume(response)
                    } else {
                        response.close()
                    }
                }
            })
        }

    private fun InputStream.copyToWithProgress(
        output: OutputStream,
        expectedBytes: Long?,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)?,
    ) {
        val buffer = ByteArray(8 * 1024)
        var downloadedBytes = 0L
        while (true) {
            val read = read(buffer)
            if (read < 0) break
            output.write(buffer, 0, read)
            downloadedBytes += read
            onProgress?.invoke(downloadedBytes, expectedBytes)
        }
    }
}

/**
 * Result returned by [AudioCacheRepository.downloadAll].
 * Partial success is possible: check [failureCount] to inform the user of any failed downloads.
 */
data class DownloadAllResult(val successCount: Int, val failureCount: Int)
