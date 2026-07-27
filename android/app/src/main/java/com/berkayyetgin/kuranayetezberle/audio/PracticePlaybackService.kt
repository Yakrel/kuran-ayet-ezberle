package com.berkayyetgin.kuranayetezberle.audio

import android.content.Intent
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.berkayyetgin.kuranayetezberle.domain.PracticeSessionController
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@OptIn(UnstableApi::class)
@AndroidEntryPoint
class PracticePlaybackService : MediaSessionService() {
    @Inject lateinit var sessionController: PracticeSessionController
    @Inject lateinit var playerHolder: PlayerHolder
    @Inject lateinit var playbackCoordinator: PlaybackCoordinator

    private var mediaSession: MediaSession? = null
    private var remoteCommandPlayer: RemoteCommandPlayer? = null

    override fun onCreate() {
        super.onCreate()
        remoteCommandPlayer = RemoteCommandPlayer(
            player = playerHolder.player,
            sessionController = sessionController,
            onRemoteStop = playbackCoordinator::stop,
        )
        mediaSession = MediaSession.Builder(this, remoteCommandPlayer!!).build()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // PlaybackCoordinator.stop() temizler: positionTicker, player ve sessionController
        playbackCoordinator.stop()
        stopPlaybackService()
        super.onTaskRemoved(rootIntent)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession?.takeIf { controllerInfo.isTrusted }
    }

    fun stopPlaybackService() {
        stopSelf()
    }

    override fun onDestroy() {
        playbackCoordinator.onPlaybackServiceDestroyed()
        mediaSession?.run {
            release()
            mediaSession = null
        }
        remoteCommandPlayer = null
        super.onDestroy()
    }
}
