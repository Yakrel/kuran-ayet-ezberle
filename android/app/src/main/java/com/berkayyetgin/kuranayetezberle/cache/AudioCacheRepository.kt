package com.berkayyetgin.kuranayetezberle.cache

import android.content.Context
import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

class AudioCacheRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val client: OkHttpClient,
) {
    private val cacheDir: File
        get() = File(context.filesDir, "surah-audio").also { it.mkdirs() }

    fun cachedFile(audio: SurahAudio): File = File(cacheDir, "${audio.recitationId}-${audio.surahId}.mp3")

    fun playbackUri(audio: SurahAudio): String {
        val cached = cachedFile(audio)
        return if (cached.exists() && cached.length() > 0L) cached.toURI().toString() else audio.url
    }

    suspend fun download(audio: SurahAudio): File = withContext(Dispatchers.IO) {
        val target = cachedFile(audio)
        if (target.exists() && target.length() > 0L) return@withContext target
        val request = Request.Builder().url(audio.url).build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                error("Audio download failed with HTTP ${response.code}; no fallback reciter is available.")
            }
            val body = response.body ?: error("Audio download returned an empty body.")
            target.outputStream().use { output -> body.byteStream().copyTo(output) }
        }
        target
    }

    suspend fun downloadAll(items: List<SurahAudio>) = withContext(Dispatchers.IO) {
        items.forEach { download(it) }
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        cacheDir.listFiles()?.forEach { file -> file.delete() }
    }
}
