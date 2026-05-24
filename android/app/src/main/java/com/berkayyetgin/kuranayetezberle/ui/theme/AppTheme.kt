package com.berkayyetgin.kuranayetezberle.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = Color(0xFF176B5B),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFC9EBDD),
    onPrimaryContainer = Color(0xFF062D25),
    secondary = Color(0xFF725B12),
    surface = Color(0xFFFFFCF5),
    surfaceVariant = Color(0xFFE7E1D5),
    background = Color(0xFFFAF7EF),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF7CD9C3),
    primaryContainer = Color(0xFF124F44),
    secondary = Color(0xFFE0C066),
    surface = Color(0xFF171C1A),
    surfaceVariant = Color(0xFF343B38),
    background = Color(0xFF101412),
)

@Composable
fun AppTheme(darkTheme: Boolean, content: @Composable () -> Unit) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = colorScheme.background.toArgb()
                window.navigationBarColor = colorScheme.background.toArgb()
                val insetsController = WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = !darkTheme
                insetsController.isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content,
    )
}
