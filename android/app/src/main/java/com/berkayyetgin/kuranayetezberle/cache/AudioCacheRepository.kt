package com.berkayyetgin.kuranayetezberle.cache

import android.content.Context
import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.IOException
import javax.inject.Inject
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.Dispatchers
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

class AudioCacheRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val client: OkHttpClient,
) {
    private val cacheDir: File
        get() = File(context.filesDir, "surah-audio").also { it.mkdirs() }

    fun cachedFile(audio: SurahAudio): File = File(cacheDir, "${audio.recitationId}-${audio.surahId}.mp3")

    fun playbackUri(audio: SurahAudio): String {
        val cached = cachedFile(audio)
        return if (AudioCachePolicy.isValidCachedAudio(cached, audio)) {
            cached.toURI().toString()
        } else {
            if (cached.exists()) cached.delete()
            audio.url
        }
    }

    suspend fun download(audio: SurahAudio): File = withContext(Dispatchers.IO) {
        val target = cachedFile(audio)
        if (AudioCachePolicy.isValidCachedAudio(target, audio)) return@withContext target
        if (target.exists()) target.delete()
        val temp = AudioCachePolicy.tempFileFor(target)
        if (temp.exists()) temp.delete()
        val request = Request.Builder().url(audio.url).build()
        try {
            client.executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    error("Audio download failed with HTTP ${response.code}; no fallback reciter is available.")
                }
                val body = response.body ?: error("Audio download returned an empty body.")
                temp.outputStream().use { output -> body.byteStream().copyTo(output) }
            }
            check(AudioCachePolicy.isValidCachedAudio(temp, audio)) {
                "Audio download was incomplete; no fallback reciter is available."
            }
            check(temp.renameTo(target)) { "Audio download could not be cached." }
            target
        } catch (error: Throwable) {
            temp.delete()
            throw error
        }
    }

    suspend fun downloadAll(items: List<SurahAudio>) = coroutineScope {
        val limiter = Semaphore(permits = 4)
        items.map { audio ->
            async(Dispatchers.IO) {
                limiter.withPermit { download(audio) }
            }
        }.awaitAll()
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        cacheDir.listFiles()?.forEach { file -> file.delete() }
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
}
