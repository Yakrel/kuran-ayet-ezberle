package com.berkayyetgin.kuranayetezberle.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        SurahEntity::class,
        AyahEntity::class,
        AyahTranslationEntity::class,
        AyahTimingEntity::class,
        ReciterAudioEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class QuranDatabase : RoomDatabase() {
    abstract fun quranDao(): QuranDao
}
