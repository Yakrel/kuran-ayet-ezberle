package com.berkayyetgin.kuranayetezberle.audio

import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails

object PlaybackPositionPolicy {
    fun ayahAt(rangeAyahs: List<AyahWithDetails>, positionMs: Long): AyahWithDetails? {
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
}
