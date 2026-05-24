package com.berkayyetgin.kuranayetezberle.data

import androidx.room.Database
import androidx.room.migration.Migration
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        SurahEntity::class,
        AyahEntity::class,
        AyahTranslationEntity::class,
        AyahTimingEntity::class,
        ReciterAudioEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class QuranDatabase : RoomDatabase() {
    abstract fun quranDao(): QuranDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE reciter_audio_new (
                        surahId INTEGER NOT NULL,
                        recitationId INTEGER NOT NULL,
                        url TEXT NOT NULL,
                        durationSeconds INTEGER NOT NULL,
                        audioSize INTEGER NOT NULL,
                        PRIMARY KEY(surahId, recitationId)
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    INSERT INTO reciter_audio_new (
                        surahId,
                        recitationId,
                        url,
                        durationSeconds,
                        audioSize
                    )
                    SELECT
                        surahId,
                        recitationId,
                        url,
                        durationSeconds,
                        audioSize
                    FROM reciter_audio
                    """.trimIndent(),
                )
                db.execSQL("DROP TABLE reciter_audio")
                db.execSQL("ALTER TABLE reciter_audio_new RENAME TO reciter_audio")
            }
        }
    }
}
