package com.berkayyetgin.kuranayetezberle.download

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.berkayyetgin.kuranayetezberle.R
import com.berkayyetgin.kuranayetezberle.cache.AudioCacheRepository
import com.berkayyetgin.kuranayetezberle.cache.InsufficientStorageException
import com.berkayyetgin.kuranayetezberle.data.FullSurahPlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.QuranRepository
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import java.util.UUID

class DownloadAllSurahsWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    private val dependencies = EntryPointAccessors.fromApplication(
        appContext,
        DownloadWorkerDependencies::class.java,
    )
    private val quranRepository = dependencies.quranRepository()
    private val audioCacheRepository = dependencies.audioCacheRepository()

    override suspend fun doWork(): Result {
        setForeground(createForegroundInfo(completed = 0, total = 114))
        val reciterId = inputData.getInt(KEY_RECITER_ID, -1)
        if (reciterId < 0) return Result.failure(errorData("Okuyucu bilgisi geçersiz."))

        return runCatching {
            val surahs = quranRepository.surahs()
            val audios = surahs.map { surah ->
                quranRepository.playbackAudioForRange(
                    surahId = surah.id,
                    startAyah = 1,
                    endAyah = surah.verseCount,
                    reciterId = reciterId,
                )
            }
            val knownRequiredBytes = audios.sumOf { audio ->
                if (audio is FullSurahPlaybackAudio && !audioCacheRepository.isCached(audio)) {
                    audio.audio.audioSize.coerceAtLeast(0L)
                } else {
                    0L
                }
            }
            audioCacheRepository.ensureAvailableSpace(knownRequiredBytes)

            val result = audioCacheRepository.downloadAllPlayback(audios) { completed, total ->
                setProgressAsync(
                    workDataOf(
                        KEY_COMPLETED to completed,
                        KEY_TOTAL to total,
                    ),
                )
                setForegroundAsync(createForegroundInfo(completed, total))
            }
            if (result.failureCount > 0 && runAttemptCount < MAX_RETRY_COUNT) {
                Result.retry()
            } else {
                Result.success(
                    workDataOf(
                        KEY_SUCCESS_COUNT to result.successCount,
                        KEY_FAILURE_COUNT to result.failureCount,
                        KEY_COMPLETED to surahs.size,
                        KEY_TOTAL to surahs.size,
                    ),
                )
            }
        }.getOrElse { error ->
            if (runAttemptCount < MAX_RETRY_COUNT && error !is InsufficientStorageException) {
                Result.retry()
            } else {
                Result.failure(errorData(error.message ?: "İndirme tamamlanamadı."))
            }
        }
    }

    private fun createForegroundInfo(completed: Int, total: Int): ForegroundInfo {
        createNotificationChannel()
        val progress = completed.coerceIn(0, total.coerceAtLeast(1))
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Kur'an sesleri indiriliyor")
            .setContentText("$progress/$total sure tamamlandı")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setProgress(total.coerceAtLeast(1), progress, total <= 0)
            .addAction(
                0,
                "İptal",
                WorkManager.getInstance(applicationContext).createCancelPendingIntent(id),
            )
            .build()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            ForegroundInfo(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = applicationContext.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Ses indirmeleri",
                NotificationManager.IMPORTANCE_LOW,
            ),
        )
    }

    private fun errorData(message: String): Data = workDataOf(KEY_ERROR to message)

    companion object {
        const val UNIQUE_WORK_NAME = "download-all-surahs"
        const val KEY_RECITER_ID = "reciter_id"
        const val KEY_COMPLETED = "completed"
        const val KEY_TOTAL = "total"
        const val KEY_SUCCESS_COUNT = "success_count"
        const val KEY_FAILURE_COUNT = "failure_count"
        const val KEY_ERROR = "error"

        private const val CHANNEL_ID = "audio-downloads"
        private const val NOTIFICATION_ID = 2401
        private const val MAX_RETRY_COUNT = 3

        fun enqueue(workManager: WorkManager, reciterId: Int): UUID {
            val request = OneTimeWorkRequestBuilder<DownloadAllSurahsWorker>()
                .setInputData(workDataOf(KEY_RECITER_ID to reciterId))
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .setRequiresStorageNotLow(true)
                        .build(),
                )
                .build()
            workManager.enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request,
            )
            return request.id
        }
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
internal interface DownloadWorkerDependencies {
    fun quranRepository(): QuranRepository
    fun audioCacheRepository(): AudioCacheRepository
}
