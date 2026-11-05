package com.caloriesimage.companion.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val EmeraldPrimary = Color(0xFF059669)
val EmeraldDark = Color(0xFF047857)
val EmeraldLight = Color(0xFFD1FAE5)

// Light Theme Palette
val LightBackground = Color(0xFFF9FAFB)
val LightSurface = Color(0xFFFFFFFF)
val LightOnSurface = Color(0xFF111827)
val LightSurfaceVariant = Color(0xFFF3F4F6)
val LightOnSurfaceVariant = Color(0xFF4B5563)

// Dark Theme Palette
val DarkBackground = Color(0xFF121212)
val DarkSurface = Color(0xFF1E1E1E)
val DarkOnSurface = Color(0xFFF3F4F6)
val DarkSurfaceVariant = Color(0xFF2A2A2A)
val DarkOnSurfaceVariant = Color(0xFF9CA3AF)

private val LightColorScheme = lightColorScheme(
    primary = EmeraldPrimary,
    onPrimary = Color.White,
    secondary = EmeraldDark,
    onSecondary = Color.White,
    background = LightBackground,
    onBackground = LightOnSurface,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant
)

private val DarkColorScheme = darkColorScheme(
    primary = EmeraldPrimary,
    onPrimary = Color.White,
    secondary = EmeraldLight,
    onSecondary = Color.Black,
    background = DarkBackground,
    onBackground = DarkOnSurface,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant
)

@Composable
fun CaloriesCompanionTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
