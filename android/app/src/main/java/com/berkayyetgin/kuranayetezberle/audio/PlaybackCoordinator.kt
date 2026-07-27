package com.berkayyetgin.kuranayetezberle.audio

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Looper
import androidx.annotation.OptIn
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.PlayerMessage
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

@OptIn(UnstableApi::class)
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

    /** Guards against duplicate ExoPlayer boundary callbacks on the main looper. */
    private var handlingBoundary = false

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var positionTicker: Job? = null
    private var rangeEndMessage: PlayerMessage? = null

    fun start(
        audio: PlaybackAudio,
        ayahs: List<AyahWithDetails>,
        range: AyahRange,
        repeatCount: Int,
        speed: Float,
        surahName: String = "Kuran-ı Kerim",
    ) {
        requireBackgroundPlaybackSupported()
        cancelRangeEndMessage()
        this.ayahs = ayahs
        this.range = range
        this.rangeAyahs = ayahs.filter { it.number in range.startAyah..range.endAyah }
        this.playbackAudio = audio
        check(rangeAyahs.isNotEmpty()) { "Unsupported data: selected ayah range is missing." }

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
                scheduleRangeEndMessage()
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
        ContextCompat.startForegroundService(
            context,
            Intent(context, PracticePlaybackService::class.java),
        )
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
        clearPlayback(PlaybackTermination.Stopped)
        stopPlaybackService()
    }

    /** Cleans singleton playback state when Android destroys the media service unexpectedly. */
    fun onPlaybackServiceDestroyed() {
        if (playbackAudio != null) clearPlayback(PlaybackTermination.Stopped)
    }

    fun setSpeed(speed: Float) {
        playerHolder.player.playbackParameters = PlaybackParameters(speed)
        sessionController.updateSpeed(speed)
    }

    /** Handles player transitions, native playlist completion, and playback errors. */
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
            if (playbackState == Player.STATE_ENDED) {
                when (playbackAudio) {
                    is AyahFilesPlaybackAudio -> handleAyahFilesRangeEnd()
                    is FullSurahPlaybackAudio -> handleFullSurahRangeEnd()
                    null -> Unit
                }
            }
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

    private fun handleFullSurahRangeEnd() {
        if (handlingBoundary) return
        handlingBoundary = true
        try {
            rangeEndMessage = null
            val currentRange = range ?: return
            when (sessionController.finishRangeRepeat()) {
                RepeatBoundaryResult.Completed, RepeatBoundaryResult.Inactive -> stopFinishedPlayback()
                RepeatBoundaryResult.Continue -> {
                    val start = ayahs.firstOrNull { it.number == currentRange.startAyah }
                    if (start != null) {
                        playerHolder.player.seekTo(start.fromMs)
                        scheduleRangeEndMessage()
                        playerHolder.player.play()
                    } else {
                        stopFinishedPlayback()
                    }
                }
            }
        } finally {
            handlingBoundary = false
        }
    }

    /**
     * Position polling is used only for UI progress. Repeat boundaries are delivered by ExoPlayer's
     * playback timeline so screen-off throttling cannot make the selected range overrun or skip.
     */
    private fun updatePosition(positionMs: Long) {
        val currentAyah = ayahAt(positionMs) ?: return
        sessionController.markPosition(currentAyah.number)
    }

    private fun scheduleRangeEndMessage() {
        val currentRange = range ?: return
        val end = ayahs.firstOrNull { it.number == currentRange.endAyah } ?: return
        cancelRangeEndMessage()
        rangeEndMessage = playerHolder.player
            .createMessage { _, _ -> handleFullSurahRangeEnd() }
            .setLooper(Looper.getMainLooper())
            .setPosition(end.toMs)
            .setDeleteAfterDelivery(true)
            .send()
    }

    private fun cancelRangeEndMessage() {
        rangeEndMessage?.cancel()
        rangeEndMessage = null
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
        clearPlayback(PlaybackTermination.Completed)
        stopPlaybackService()
    }

    private fun failPlayback(message: String) {
        clearPlayback(PlaybackTermination.Failed(message))
        stopPlaybackService()
    }

    private fun clearPlayback(termination: PlaybackTermination) {
        stopPositionTicker()
        cancelRangeEndMessage()
        playerHolder.player.removeListener(playbackStateListener)
        playerHolder.player.pause()
        playerHolder.player.stop()
        ayahs = emptyList()
        rangeAyahs = emptyList()
        range = null
        playbackAudio = null
        when (termination) {
            PlaybackTermination.Completed -> sessionController.complete()
            PlaybackTermination.Stopped -> sessionController.stop()
            is PlaybackTermination.Failed -> sessionController.fail(termination.message)
        }
    }

    private fun stopPlaybackService() {
        context.stopService(Intent(context, PracticePlaybackService::class.java))
    }

    private sealed interface PlaybackTermination {
        data object Completed : PlaybackTermination
        data object Stopped : PlaybackTermination
        data class Failed(val message: String) : PlaybackTermination
    }

    private companion object {
        const val POSITION_TICK_MS = 150L
    }
}
