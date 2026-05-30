package com.berkayyetgin.kuranayetezberle.audio

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import com.berkayyetgin.kuranayetezberle.cache.AudioCacheRepository
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.AyahFilesPlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.FullSurahPlaybackAudio
import com.berkayyetgin.kuranayetezberle.data.PlaybackAudio
import com.berkayyetgin.kuranayetezberle.domain.AyahRange
import com.berkayyetgin.kuranayetezberle.domain.PracticeSessionController
import com.berkayyetgin.kuranayetezberle.domain.RepeatBoundaryResult
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

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
    private var playbackAudio: PlaybackAudio? = null

    /**
     * Guards against re-entrant calls to [updatePosition] from the ticker.
     * Since the ticker runs on Main.immediate (single-threaded), this is a plain boolean —
     * no need for atomics or volatiles.
     */
    private var handlingBoundary = false

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var positionTicker: Job? = null

    fun start(
        audio: PlaybackAudio,
        ayahs: List<AyahWithDetails>,
        range: AyahRange,
        repeatCount: Int,
        speed: Float,
        surahName: String = "Kuran-ı Kerim",
    ) {
        requireBackgroundPlaybackSupported()
        this.ayahs = ayahs
        this.range = range
        this.rangeAyahs = ayahs.filter { it.number in range.startAyah..range.endAyah }
        this.playbackAudio = audio
        check(rangeAyahs.isNotEmpty()) { "Unsupported data: selected ayah range is missing." }

        context.startService(Intent(context, PracticePlaybackService::class.java))

        val exoPlayer = playerHolder.player
        exoPlayer.removeListener(playbackStateListener)
        exoPlayer.addListener(playbackStateListener)

        when (audio) {
            is FullSurahPlaybackAudio -> {
                val start = ayahs.firstOrNull { it.number == range.startAyah }
                    ?: error("Unsupported data: start ayah timing is missing.")
                val metadata = MediaMetadata.Builder()
                    .setTitle(surahName)
                    .setArtist("Ayet ${range.startAyah} - ${range.endAyah}")
                    .build()
                val mediaItem = MediaItem.Builder()
                    .setUri(cacheRepository.resolvePlaybackUri(audio.audio))
                    .setMediaMetadata(metadata)
                    .build()
                exoPlayer.setMediaItem(mediaItem)
                exoPlayer.prepare()
                exoPlayer.playbackParameters = PlaybackParameters(speed)
                exoPlayer.seekTo(start.fromMs)
            }
            is AyahFilesPlaybackAudio -> {
                val mediaItems = audio.ayahs.map { ayahAudio ->
                    val metadata = MediaMetadata.Builder()
                        .setTitle(surahName)
                        .setArtist("Ayet ${ayahAudio.ayahNumber}")
                        .build()
                    MediaItem.Builder()
                        .setMediaId(ayahAudio.ayahNumber.toString())
                        .setUri(cacheRepository.resolvePlaybackUri(ayahAudio))
                        .setMediaMetadata(metadata)
                        .build()
                }
                check(mediaItems.isNotEmpty()) { "Unsupported data: selected ayah audio range is missing." }
                exoPlayer.setMediaItems(mediaItems)
                exoPlayer.prepare()
                exoPlayer.playbackParameters = PlaybackParameters(speed)
            }
        }
        sessionController.start(range, repeatCount, speed)
        exoPlayer.play()
        if (audio is FullSurahPlaybackAudio) startPositionTicker()
    }

    fun pause() {
        stopPositionTicker()
        playerHolder.player.pause()
        sessionController.pauseByUser()
    }

    fun resumeFromUser() {
        if (sessionController.resumeFromUserOrRemote()) {
            playerHolder.player.play()
            if (playbackAudio is FullSurahPlaybackAudio) {
                startPositionTicker()
            }
        }
    }

    fun stop() {
        stopPositionTicker()
        playerHolder.player.pause()
        playerHolder.player.stop()
        playbackAudio = null
        sessionController.stop()
        stopPlaybackService()
    }

    fun setSpeed(speed: Float) {
        playerHolder.player.playbackParameters = PlaybackParameters(speed)
        sessionController.updateSpeed(speed)
    }

    /**
     * Handles only playback state transitions (playing/paused) and playback errors.
     *
     * Position tracking is done **exclusively** by [positionTicker]. Removing the
     * [Player.Listener.onEvents] override eliminates the double-firing of [updatePosition]
     * that previously caused [finishRangeRepeat] to be called twice per boundary crossing.
     */
    private val playbackStateListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (playbackAudio is FullSurahPlaybackAudio) {
                if (isPlaying) startPositionTicker() else stopPositionTicker()
            }
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            if (playbackAudio !is AyahFilesPlaybackAudio) return
            val activeAyah = mediaItem?.mediaId?.toIntOrNull() ?: return
            sessionController.markPosition(activeAyah)
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackAudio !is AyahFilesPlaybackAudio || playbackState != Player.STATE_ENDED) return
            handleAyahFilesRangeEnd()
        }

        override fun onPlayerError(error: PlaybackException) {
            failPlayback(error.message ?: "Ses oynatılamadı. Bağlantını kontrol edip tekrar dene.")
        }
    }

    private fun handleAyahFilesRangeEnd() {
        if (handlingBoundary) return
        handlingBoundary = true
        try {
            when (sessionController.finishRangeRepeat()) {
                RepeatBoundaryResult.Completed, RepeatBoundaryResult.Inactive -> stopFinishedPlayback()
                RepeatBoundaryResult.Continue -> {
                    playerHolder.player.seekTo(0, 0L)
                    playerHolder.player.play()
                }
            }
        } finally {
            handlingBoundary = false
        }
    }

    private fun updatePosition(positionMs: Long) {
        // Prevent re-entrant boundary handling: if seekTo() triggers onIsPlayingChanged which
        // restarts the ticker mid-boundary handling, we must not re-enter this logic.
        if (handlingBoundary) return

        val currentRange = range ?: return
        val end = ayahs.firstOrNull { it.number == currentRange.endAyah } ?: return

        if (positionMs >= end.toMs) {
            handlingBoundary = true
            try {
                when (sessionController.finishRangeRepeat()) {
                    RepeatBoundaryResult.Completed, RepeatBoundaryResult.Inactive -> stopFinishedPlayback()
                    RepeatBoundaryResult.Continue -> {
                        val start = ayahs.first { it.number == currentRange.startAyah }
                        playerHolder.player.seekTo(start.fromMs)
                        playerHolder.player.play()
                    }
                }
            } finally {
                handlingBoundary = false
            }
            return
        }

        val currentAyah = ayahAt(positionMs) ?: return
        sessionController.markPosition(currentAyah.number)
    }

    private fun ayahAt(positionMs: Long): AyahWithDetails? =
        PlaybackPositionPolicy.ayahAt(rangeAyahs, positionMs)

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

    private fun startPositionTicker() {
        if (positionTicker?.isActive == true) return
        positionTicker = scope.launch {
            while (isActive) {
                updatePosition(playerHolder.player.currentPosition)
                delay(POSITION_TICK_MS)
            }
        }
    }

    private fun stopPositionTicker() {
        positionTicker?.cancel()
        positionTicker = null
    }

    private fun stopFinishedPlayback() {
        stopPositionTicker()
        playerHolder.player.pause()
        playerHolder.player.stop()
        playbackAudio = null
        stopPlaybackService()
    }

    private fun failPlayback(message: String) {
        stopPositionTicker()
        playerHolder.player.pause()
        playerHolder.player.stop()
        playbackAudio = null
        sessionController.fail(message)
        stopPlaybackService()
    }

    private fun stopPlaybackService() {
        context.stopService(Intent(context, PracticePlaybackService::class.java))
    }

    private companion object {
        const val POSITION_TICK_MS = 150L
    }
}
