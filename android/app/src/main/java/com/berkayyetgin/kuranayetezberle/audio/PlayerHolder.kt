package com.berkayyetgin.kuranayetezberle.audio

import android.content.Context
import android.os.Looper
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlayerHolder @Inject constructor(
    @ApplicationContext context: Context,
) {
    val player: ExoPlayer = ExoPlayer.Builder(context)
        .setLooper(Looper.getMainLooper())
        .build()
}
