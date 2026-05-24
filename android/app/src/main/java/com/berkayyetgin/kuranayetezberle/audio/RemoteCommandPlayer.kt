package com.berkayyetgin.kuranayetezberle.audio

import androidx.annotation.OptIn
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import com.berkayyetgin.kuranayetezberle.domain.PracticeSessionController

@OptIn(UnstableApi::class)
class RemoteCommandPlayer(
    player: Player,
    private val sessionController: PracticeSessionController,
    private val onRemoteStop: () -> Unit,
) : ForwardingPlayer(player) {
    override fun play() {
        if (sessionController.onRemotePlay()) {
            super.play()
        }
    }

    override fun pause() {
        if (sessionController.onRemotePause()) {
            super.pause()
        }
    }

    override fun stop() {
        sessionController.stop()
        super.pause()
        super.stop()
        onRemoteStop()
    }

    override fun setPlayWhenReady(playWhenReady: Boolean) {
        if (playWhenReady) {
            play()
        } else {
            pause()
        }
    }
}
