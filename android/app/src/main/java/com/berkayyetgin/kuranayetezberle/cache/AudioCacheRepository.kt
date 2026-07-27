package com.berkayyetgin.kuranayetezberle.cache

import android.content.Context
import com.berkayyetgin.kuranayetezberle.data.AyahAudioSource
import com.berkayyetgin.kuranayetezberle.data.AyahFilesPlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.FullSurahPlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.PlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import dagger.hilt.android.qualifiers.ApplicationContext
import android.os.StatFs
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.ConcurrentHashMap
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
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withLock
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
    private val downloadLimiter = Semaphore(permits = MAX_PARALLEL_DOWNLOADS)
    private val fileLocks = ConcurrentHashMap<String, Mutex>()

    private val cacheDir: File
        get() = File(context.noBackupFilesDir, "surah-audio").also { it.mkdirs() }

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
            AudioCachePolicy.sizeMetadataFileFor(cached).delete()
            audio.url
        }
    }

    /** Downloads a single surah and resumes a retained partial file when the server supports it. */
    suspend fun download(
        audio: SurahAudio,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)? = null,
    ): File = downloadFile(
        target = cachedFile(audio),
        url = audio.url,
        knownExpectedBytes = audio.audioSize.takeIf { it > 0L },
        isValidCache = { AudioCachePolicy.isValidCachedAudio(it, audio) },
        isCompleteDownload = AudioCachePolicy::isCompleteDownloadedAudio,
        writeSizeMetadata = false,
        onProgress = onProgress,
        emptyBodyMessage = "Ses dosyası boş döndü.",
        incompleteMessage = "Ses dosyası eksik indi. Bağlantını kontrol edip tekrar dene.",
    )

    suspend fun download(
        audio: AyahAudioSource,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)? = null,
    ): File = downloadFile(
        target = cachedFile(audio),
        url = audio.url,
        knownExpectedBytes = null,
        isValidCache = AudioCachePolicy::isValidCachedAyahAudio,
        isCompleteDownload = AudioCachePolicy::isCompleteDownloadedAyahAudio,
        writeSizeMetadata = true,
        onProgress = onProgress,
        emptyBodyMessage = "Ayet ses dosyası boş döndü.",
        incompleteMessage = "Ayet ses dosyası eksik indi. Bağlantını kontrol edip tekrar dene.",
    )

    private suspend fun downloadFile(
        target: File,
        url: String,
        knownExpectedBytes: Long?,
        isValidCache: (File) -> Boolean,
        isCompleteDownload: (File, Long?) -> Boolean,
        writeSizeMetadata: Boolean,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)?,
        emptyBodyMessage: String,
        incompleteMessage: String,
    ): File = withContext(Dispatchers.IO) {
        val lock = fileLocks.computeIfAbsent(target.absolutePath) { Mutex() }
        lock.withLock {
            if (isValidCache(target)) return@withLock target
            target.delete()
            AudioCachePolicy.sizeMetadataFileFor(target).delete()
            val temp = AudioCachePolicy.tempFileFor(target)

            downloadLimiter.withPermit {
                val partialBytes = temp.takeIf { it.isFile }?.length() ?: 0L
                val request = Request.Builder()
                    .url(url)
                    .apply { if (partialBytes > 0L) header("Range", "bytes=$partialBytes-") }
                    .build()
                client.executeCancellable(request).use { response ->
                    if (response.code == HTTP_RANGE_NOT_SATISFIABLE) {
                        temp.delete()
                        error("Kısmi indirme sunucuyla uyuşmadı; yeniden denenecek.")
                    }
                    if (!response.isSuccessful) {
                        error("Ses dosyası indirilemedi (HTTP ${response.code}).")
                    }
                    val body = response.body ?: error(emptyBodyMessage)
                    val append = response.code == HTTP_PARTIAL_CONTENT && partialBytes > 0L
                    if (!append) temp.delete()
                    val startingBytes = if (append) partialBytes else 0L
                    val responseBytes = body.contentLength().takeIf { it > 0L }
                    val expectedBytes = contentRangeTotal(response.header("Content-Range"))
                        ?: responseBytes?.plus(startingBytes)
                        ?: knownExpectedBytes
                    val requiredBytes = expectedBytes?.minus(startingBytes)?.coerceAtLeast(0L)
                        ?: responseBytes
                    requiredBytes?.let(::ensureAvailableSpace)

                    body.byteStream().use { input ->
                        FileOutputStream(temp, append).use { output ->
                            input.copyToWithProgress(
                                output = output,
                                startingBytes = startingBytes,
                                expectedBytes = expectedBytes,
                                onProgress = onProgress,
                            )
                        }
                    }
                    check(isCompleteDownload(temp, expectedBytes)) { incompleteMessage }
                }
                check(temp.renameTo(target)) { "Ses dosyası kaydedilemedi." }
                if (writeSizeMetadata) {
                    AudioCachePolicy.sizeMetadataFileFor(target).writeText(target.length().toString())
                }
                target
            }
        }
    }

    fun ensureAvailableSpace(requiredBytes: Long) {
        if (requiredBytes <= 0L) return
        val availableBytes = StatFs(cacheDir.absolutePath).availableBytes
        if (availableBytes - requiredBytes < MIN_FREE_SPACE_BYTES) {
            throw InsufficientStorageException(
                "Yeterli depolama alanı yok. En az ${formatMegabytes(requiredBytes + MIN_FREE_SPACE_BYTES)} MB boş alan gerekli.",
            )
        }
    }

    private fun contentRangeTotal(value: String?): Long? = value
        ?.substringAfter('/', missingDelimiterValue = "")
        ?.takeUnless { it.isBlank() || it == "*" }
        ?.toLongOrNull()

    private fun formatMegabytes(bytes: Long): Long =
        (bytes + BYTES_PER_MEGABYTE - 1L) / BYTES_PER_MEGABYTE

    suspend fun download(
        audio: PlaybackAudio,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)? = null,
        onItemCompleted: ((completedCount: Int, totalCount: Int) -> Unit)? = null,
    ) {
        when (audio) {
            is FullSurahPlaybackAudio -> download(audio.audio, onProgress)
            is AyahFilesPlaybackAudio -> {
                val total = audio.ayahs.size
                val completed = AtomicInteger(0)
                audio.ayahs.chunked(MAX_PARALLEL_DOWNLOADS).forEach { chunk ->
                    coroutineScope {
                        chunk.map { ayahAudio ->
                            async(Dispatchers.IO) {
                                download(ayahAudio)
                                onItemCompleted?.invoke(completed.incrementAndGet(), total)
                            }
                        }.awaitAll()
                    }
                }
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
        val limiter = Semaphore(permits = MAX_PARALLEL_DOWNLOADS)
        val completed = AtomicInteger(0)
        val results = items.map { audio ->
            async(Dispatchers.IO) {
                limiter.withPermit {
                    runCatching { download(audio) }
                        .also { onItemCompleted?.invoke(completed.incrementAndGet(), items.size) }
                }
            }
        }.awaitAll()
        throwIfStorageIsInsufficient(results)
        DownloadAllResult(
            successCount = results.count { it.isSuccess },
            failureCount = results.count { it.isFailure },
        )
    }

    suspend fun downloadAllPlayback(
        items: List<PlaybackAudio>,
        onItemCompleted: ((completedCount: Int, totalCount: Int) -> Unit)? = null,
    ): DownloadAllResult = coroutineScope {
        val limiter = Semaphore(permits = MAX_PARALLEL_DOWNLOADS)
        val completed = AtomicInteger(0)
        val results = items.map { audio ->
            async(Dispatchers.IO) {
                limiter.withPermit {
                    runCatching { download(audio) }
                        .also { onItemCompleted?.invoke(completed.incrementAndGet(), items.size) }
                }
            }
        }.awaitAll()
        throwIfStorageIsInsufficient(results)
        DownloadAllResult(
            successCount = results.count { it.isSuccess },
            failureCount = results.count { it.isFailure },
        )
    }

    private fun throwIfStorageIsInsufficient(results: List<Result<*>>) {
        results.firstNotNullOfOrNull { it.exceptionOrNull() as? InsufficientStorageException }
            ?.let { throw it }
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
        startingBytes: Long,
        expectedBytes: Long?,
        onProgress: ((downloadedBytes: Long, totalBytes: Long?) -> Unit)?,
    ) {
        val buffer = ByteArray(8 * 1024)
        var downloadedBytes = startingBytes
        while (true) {
            val read = read(buffer)
            if (read < 0) break
            output.write(buffer, 0, read)
            downloadedBytes += read
            onProgress?.invoke(downloadedBytes, expectedBytes)
        }
    }

    private companion object {
        const val MAX_PARALLEL_DOWNLOADS = 4
        const val HTTP_PARTIAL_CONTENT = 206
        const val HTTP_RANGE_NOT_SATISFIABLE = 416
        const val BYTES_PER_MEGABYTE = 1024L * 1024L
        const val MIN_FREE_SPACE_BYTES = 32L * BYTES_PER_MEGABYTE
    }
}

/**
 * Result returned by [AudioCacheRepository.downloadAll].
 * Partial success is possible: check [failureCount] to inform the user of any failed downloads.
 */
data class DownloadAllResult(val successCount: Int, val failureCount: Int)

class InsufficientStorageException(message: String) : IOException(message)
