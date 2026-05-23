package com.berkayyetgin.kuranayetezberle.audio

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import com.berkayyetgin.kuranayetezberle.cache.AudioCacheRepository
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.SurahAudio
import com.berkayyetgin.kuranayetezberle.domain.AyahRange
import com.berkayyetgin.kuranayetezberle.domain.PracticeSessionController
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlaybackCoordinator @Inject constructor(
    @ApplicationContext private val context: Context,
    private val cacheRepository: AudioCacheRepository,
    private val sessionController: PracticeSessionController,
    private val playerHolder: PlayerHolder,
) {
    private var ayahs: List<AyahWithDetails> = emptyList()
    private var rangeAyahs: List<AyahWithDetails> = emptyList()
    private var range: AyahRange? = null
    private var listenerAttached = false

    fun start(
        audio: SurahAudio,
        ayahs: List<AyahWithDetails>,
        range: AyahRange,
        repeatCount: Int,
        speed: Float,
    ) {
        requireBackgroundPlaybackSupported()
        this.ayahs = ayahs
        this.range = range
        this.rangeAyahs = ayahs.filter { it.number in range.startAyah..range.endAyah }
        val start = ayahs.firstOrNull { it.number == range.startAyah }
            ?: error("Unsupported data: start ayah timing is missing.")
        ContextCompat.startForegroundService(context, Intent(context, PracticePlaybackService::class.java))
        val exoPlayer = playerHolder.player
        if (!listenerAttached) {
            exoPlayer.addListener(positionListener)
            listenerAttached = true
        }
        exoPlayer.setMediaItem(MediaItem.fromUri(cacheRepository.playbackUri(audio)))
        exoPlayer.prepare()
        exoPlayer.playbackParameters = PlaybackParameters(speed)
        exoPlayer.seekTo(start.fromMs)
        sessionController.start(range, repeatCount, speed)
        exoPlayer.play()
    }

    fun pause() {
        playerHolder.player.pause()
        sessionController.pauseByUser()
    }

    fun resumeFromUser() {
        if (sessionController.resumeFromUserOrRemote()) playerHolder.player.play()
    }

    fun stop() {
        playerHolder.player.pause()
        playerHolder.player.stop()
        sessionController.stop()
        stopPlaybackService()
    }

    private val positionListener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) {
            updatePosition(player.currentPosition)
        }
    }

    private fun updatePosition(positionMs: Long) {
        val currentRange = range ?: return
        val end = ayahs.firstOrNull { it.number == currentRange.endAyah } ?: return
        if (positionMs >= end.toMs) {
            val finished = sessionController.finishRangeRepeat()
            if (finished) {
                playerHolder.player.pause()
                playerHolder.player.stop()
                stopPlaybackService()
            } else {
                val start = ayahs.first { it.number == currentRange.startAyah }
                playerHolder.player.seekTo(start.fromMs)
                playerHolder.player.play()
            }
            return
        }
        val currentAyah = ayahAt(positionMs) ?: return
        sessionController.markPosition(currentAyah.number)
    }

    private fun ayahAt(positionMs: Long): AyahWithDetails? {
        if (rangeAyahs.isEmpty()) return null
        val index = rangeAyahs.binarySearch { ayah ->
            when {
                positionMs < ayah.fromMs -> 1
                positionMs >= ayah.toMs -> -1
                else -> 0
            }
        }
        if (index >= 0) return rangeAyahs[index]
        val insertionPoint = -index - 1
        return rangeAyahs.getOrNull((insertionPoint - 1).coerceAtLeast(0))
            ?.takeIf { positionMs >= it.fromMs && positionMs < it.toMs }
    }

    private fun requireBackgroundPlaybackSupported() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            check(granted) {
                "Background playback requires notification permission on this Android version."
            }
        }
    }

    private fun stopPlaybackService() {
        context.stopService(Intent(context, PracticePlaybackService::class.java))
    }
}
