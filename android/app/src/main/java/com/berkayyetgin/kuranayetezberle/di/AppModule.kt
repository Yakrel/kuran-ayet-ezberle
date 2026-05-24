package com.berkayyetgin.kuranayetezberle.di

import android.content.Context
import androidx.room.Room
import com.berkayyetgin.kuranayetezberle.data.QuranDao
import com.berkayyetgin.kuranayetezberle.data.QuranDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): QuranDatabase =
        Room.databaseBuilder(context, QuranDatabase::class.java, "quran.db")
            .addMigrations(QuranDatabase.MIGRATION_1_2)
            .fallbackToDestructiveMigration(false)
            .build()

    @Provides
    fun provideQuranDao(database: QuranDatabase): QuranDao = database.quranDao()

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient = OkHttpClient.Builder().build()
}
