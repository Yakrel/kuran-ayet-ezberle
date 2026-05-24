package com.berkayyetgin.kuranayetezberle.audio

import android.content.Intent
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.berkayyetgin.kuranayetezberle.domain.PlaybackSessionState
import com.berkayyetgin.kuranayetezberle.domain.PracticeSessionController
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class PracticePlaybackService : MediaSessionService() {
    @Inject lateinit var sessionController: PracticeSessionController
    @Inject lateinit var playerHolder: PlayerHolder

    private var mediaSession: MediaSession? = null
    private var remoteCommandPlayer: RemoteCommandPlayer? = null

    override fun onCreate() {
        super.onCreate()
        remoteCommandPlayer = RemoteCommandPlayer(
            player = playerHolder.player,
            sessionController = sessionController,
            onRemoteStop = ::stopPlaybackService,
        )
        mediaSession = MediaSession.Builder(this, remoteCommandPlayer!!).build()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        sessionController.stop()
        stopPlaybackService()
        super.onTaskRemoved(rootIntent)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    fun stopPlaybackService() {
        stopSelf()
    }

    override fun onDestroy() {
        playerHolder.player.pause()
        playerHolder.player.stop()
        mediaSession?.run {
            release()
            mediaSession = null
        }
        remoteCommandPlayer = null
        super.onDestroy()
    }
}
