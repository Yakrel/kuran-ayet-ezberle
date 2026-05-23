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

    override fun onCreate() {
        super.onCreate()
        mediaSession = MediaSession.Builder(this, playerHolder.player).build()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        sessionController.stop()
        stopPlaybackService()
        super.onTaskRemoved(rootIntent)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        val state = sessionController.state.value
        if (state is PlaybackSessionState.Idle || state is PlaybackSessionState.Stopped ||
            state is PlaybackSessionState.Completed || state is PlaybackSessionState.Error
        ) {
            return null
        }
        return mediaSession
    }

    fun stopPlaybackService() {
        playerHolder.player.pause()
        playerHolder.player.stop()
        mediaSession?.release()
        mediaSession = null
        stopSelf()
    }

    override fun onDestroy() {
        stopPlaybackService()
        super.onDestroy()
    }
}
