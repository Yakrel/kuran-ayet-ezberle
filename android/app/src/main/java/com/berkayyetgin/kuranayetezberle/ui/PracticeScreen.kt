package com.berkayyetgin.kuranayetezberle.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.RadioButton
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.surfaceColorAtElevation
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.berkayyetgin.kuranayetezberle.R
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.SurahEntity
import com.berkayyetgin.kuranayetezberle.domain.PlaybackSessionState
import com.berkayyetgin.kuranayetezberle.ui.theme.AppTheme
import java.util.Locale
import kotlinx.coroutines.delay

private val ArabicFontFamily = FontFamily(Font(R.font.uthmanic_hafs_v22))

// Discrete speed steps shown as inline chips during an active session.
private val SPEED_STEPS = listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f)

private fun Float.toSpeedLabel(): String = when (this) {
    0.75f -> "0.75x"
    1.0f -> "1x"
    1.25f -> "1.25x"
    1.5f -> "1.5x"
    2.0f -> "2x"
    else -> "${"%.2f".format(this)}x"
}

private fun String.normalizeTurkish(): String {
    return this.lowercase(Locale("tr", "TR"))
        .replace('â', 'a').replace('î', 'i').replace('û', 'u')
        .replace('Â', 'a').replace('Î', 'i').replace('Û', 'u')
        .replace('ç', 'c').replace('ğ', 'g').replace('ı', 'i')
        .replace('ö', 'o').replace('ş', 's').replace('ü', 'u')
}

private fun String.matchesSurahQuery(query: String): Boolean =
    normalizeTurkish().contains(query.normalizeTurkish())

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PracticeScreen(viewModel: PracticeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var showSettings by rememberSaveable { mutableStateOf(false) }
    var showSurahSelection by remember { mutableStateOf(false) }
    var showVerseSelectionForStart by remember { mutableStateOf(false) }
    var isSelectionMode by remember { mutableStateOf(false) }
    var showRepeatSelection by remember { mutableStateOf(false) }
    var showDownloadPrompt by remember { mutableStateOf(false) }

    val resolvedDarkTheme = state.settings.darkTheme ?: isSystemInDarkTheme()
    
    val view = LocalView.current
    val isSessionActive = state.sessionState is PlaybackSessionState.Active || state.sessionState is PlaybackSessionState.PausedByUser
    LaunchedEffect(isSessionActive) {
        view.keepScreenOn = isSessionActive
    }

    // Auto-clear download Done state after 2 seconds so the UI returns to idle.
    LaunchedEffect(state.downloadState) {
        if (state.downloadState is DownloadState.Done) {
            delay(2_000)
            viewModel.clearDownloadDone()
        }
    }

    AppTheme(darkTheme = resolvedDarkTheme) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = Color.Transparent, // Let the Box handle background
            contentWindowInsets = WindowInsets(0, 0, 0, 0),
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(top = WindowInsets.safeDrawing.asPaddingValues().calculateTopPadding())
                        .padding(horizontal = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    PracticeHeader(
                        state = state,
                        onSurahClick = { showSurahSelection = true },
                        onNextSurah = viewModel::nextSurah,
                        onPrevSurah = viewModel::previousSurah,
                        onAyahRangeClick = { isSelectionMode = !isSelectionMode },
                        onRepeatClick = { showRepeatSelection = true },
                        onPageClick = { /* Not fully implemented sheet for pages, fallback to quick select or a simple list, wait let's just trigger quick select if needed */ viewModel.selectPageRange() },
                        onSettingsClick = { showSettings = true },
                        onSpeedClick = {
                            val currentIndex = SPEED_STEPS.indexOf(state.settings.playbackSpeed)
                            val nextIndex = (currentIndex + 1) % SPEED_STEPS.size
                            viewModel.setSpeed(SPEED_STEPS[nextIndex])
                        }
                    )

                    state.error?.let { ErrorStrip(it, viewModel::clearError) }

                    val currentActiveAyah = (state.sessionState as? PlaybackSessionState.Active)?.activeAyah 
                                            ?: (state.sessionState as? PlaybackSessionState.PausedByUser)?.active?.activeAyah
                    
                    AyahList(
                        ayahs = state.ayahs,
                        selectedPage = state.selectedPage,
                        activeAyah = currentActiveAyah,
                        startAyah = state.startAyah,
                        endAyah = state.endAyah,
                        showTranscription = state.settings.showTranscription,
                        arabicTextSizeSp = state.settings.arabicTextSizeSp,
                        isSelectionMode = isSelectionMode,
                        onSelectionModeToggle = { isSelectionMode = it },
                        onPageSelected = viewModel::setPage,
                        onPageSwiped = viewModel::onPageSwipe,
                        onAyahClick = { /* Click to select in mode */ },
                        onSetStart = viewModel::setStartAyah,
                        onSetStartAndEnd = viewModel::setStartAndEndAyah,
                        onSetEnd = viewModel::setEndAyah,
                        modifier = Modifier.weight(1f)
                    )
                    
                    // Add space at the bottom for the player to not cover the last items
                    Spacer(modifier = Modifier.height(140.dp).navigationBarsPadding())
                }

                // Best Practice: Persistent Bottom Player Card
                BottomPlayerCard(
                    state = state,
                    onPlayClick = {
                        val session = state.sessionState
                        val isIdle = session is PlaybackSessionState.Idle ||
                                     session is PlaybackSessionState.Stopped ||
                                     session is PlaybackSessionState.Completed

                        if (isIdle && !state.isSelectedSurahCached && state.settings.showDownloadPrompt) {
                            showDownloadPrompt = true
                        } else if (isIdle) {
                            viewModel.start()
                        } else {
                            viewModel.pauseOrResume()
                        }
                    },
                    onStopClick = viewModel::stop,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }

        if (showDownloadPrompt) {
            DownloadPromptDialog(
                onDownloadAndPlay = { dontShowAgain ->
                    if (dontShowAgain) viewModel.setShowDownloadPrompt(false)
                    viewModel.downloadSelectedSurah()
                    viewModel.start()
                    showDownloadPrompt = false
                },
                onJustPlay = { dontShowAgain ->
                    if (dontShowAgain) viewModel.setShowDownloadPrompt(false)
                    viewModel.start()
                    showDownloadPrompt = false
                },
                onDismiss = { showDownloadPrompt = false }
            )
        }

        if (showSurahSelection) {
            SurahSelectionSheet(
                surahs = state.surahs,
                selectedSurahId = state.selectedSurahId,
                onSurahSelected = {
                    viewModel.selectSurah(it)
                    showSurahSelection = false
                },
                onDismiss = { showSurahSelection = false }
            )
        }

        // Removed AyahRangeSheet, replaced by inline Selection Mode

        if (showRepeatSelection) {
            RepeatSelectionSheet(
                currentRepeat = state.settings.repeatCount,
                onRepeatSelected = { 
                    viewModel.setRepeatCount(it)
                    showRepeatSelection = false 
                },
                onDismiss = { showRepeatSelection = false }
            )
        }

        if (showSettings) {
            SettingsSheet(
                state = state,
                viewModel = viewModel,
                resolvedDarkTheme = resolvedDarkTheme,
                onDismiss = { showSettings = false },
            )
        }
    }
}

// ─── Header ─────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PracticeHeader(
    state: PracticeUiState,
    onSurahClick: () -> Unit,
    onNextSurah: () -> Unit,
    onPrevSurah: () -> Unit,
    onAyahRangeClick: () -> Unit,
    onRepeatClick: () -> Unit,
    onPageClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onSpeedClick: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp, bottom = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Row 1
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            IconButton(
                onClick = { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onPrevSurah() },
                enabled = state.selectedSurahId > 1,
                modifier = Modifier.size(32.dp)
            ) { Icon(Icons.Filled.ChevronLeft, contentDescription = "Önceki Sure") }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .weight(1f)
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    .clickable { onSurahClick() }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = state.selectedSurah?.let { "${it.id}. ${it.name}" } ?: "Sure Seçin",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.List,
                    contentDescription = "Hızlı Sure Seç",
                    tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f),
                    modifier = Modifier.size(16.dp)
                )
            }

            IconButton(
                onClick = { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onNextSurah() },
                enabled = state.selectedSurahId < 114,
                modifier = Modifier.size(32.dp)
            ) { Icon(Icons.Filled.ChevronRight, contentDescription = "Sonraki Sure") }

            Surface(
                onClick = onSpeedClick,
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.height(32.dp)
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 8.dp)) {
                    Text(
                        text = state.settings.playbackSpeed.toSpeedLabel(),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            IconButton(onClick = onSettingsClick, modifier = Modifier.size(32.dp)) {
                Icon(imageVector = Icons.Filled.Settings, contentDescription = "Ayarlar", modifier = Modifier.size(20.dp))
            }
        }

        // Row 2
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HeaderChip(
                label = "Ayet",
                value = "${state.startAyah} \u2192 ${state.endAyah}",
                onClick = onAyahRangeClick,
                modifier = Modifier.weight(1.5f)
            )
            HeaderChip(
                label = "Tekrar",
                value = "${state.settings.repeatCount}",
                onClick = onRepeatClick,
                modifier = Modifier.weight(1f)
            )
            HeaderChip(
                label = "Sayfa",
                value = "${state.selectedPage}",
                onClick = onPageClick,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun HeaderChip(
    label: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 6.dp)
    ) {
        Text(
            text = label.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f)
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

/**
 * Shows either a spinning progress indicator (while downloading), a filled check-circle icon
 * (when the surah is cached), or a download cloud icon (when not cached / idle).
 * Tapping the icon triggers a download of the selected surah.
 */
@Composable
private fun CacheStatusButton(
    isCached: Boolean,
    downloadState: DownloadState,
    onDownload: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(enabled = !isCached && downloadState !is DownloadState.InProgress) { onDownload() }
            .padding(horizontal = 4.dp, vertical = 2.dp)
    ) {
        Box(
            modifier = Modifier.size(32.dp),
            contentAlignment = Alignment.Center,
        ) {
            when {
                downloadState is DownloadState.InProgress -> {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                downloadState is DownloadState.Done || isCached -> {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = "Önbellekte mevcut",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp),
                    )
                }
                else -> {
                    Icon(
                        imageVector = Icons.Filled.CloudDownload,
                        contentDescription = "Sureyi indir",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
        
        Text(
            text = when {
                downloadState is DownloadState.InProgress -> "İndiriliyor..."
                isCached -> "İndirildi"
                else -> "İndir"
            },
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = if (isCached) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

// ─── Playback Controls ───────────────────────────────────────────────────────

// ─── Playback Controls ───────────────────────────────────────────────────────

@Composable
private fun BottomPlayerCard(
    state: PracticeUiState,
    onPlayClick: () -> Unit,
    onStopClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val session = state.sessionState
    val isPlaying = session is PlaybackSessionState.Active
    val isPaused = session is PlaybackSessionState.PausedByUser
    val isCompleted = session is PlaybackSessionState.Completed
    val isActive = isPlaying || isPaused
    val haptic = LocalHapticFeedback.current

    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .height(96.dp) // Fixed height for consistent glass effect
    ) {
        // Glass Background Layer
        Box(
            modifier = Modifier
                .fillMaxSize()
                .blur(20.dp) // Blur only the background
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp).copy(alpha = 0.6f))
                .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(24.dp))
        )

        // Sharp Content Layer
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color.Transparent, // Surface is transparent, background provides color/blur
            shape = RoundedCornerShape(24.dp),
            shadowElevation = 8.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                if (isActive) {
                    val progress = when (session) {
                        is PlaybackSessionState.Active -> session.currentRepeat.toFloat() / session.repeatTarget
                        is PlaybackSessionState.PausedByUser -> session.active.currentRepeat.toFloat() / session.active.repeatTarget
                        else -> 0f
                    }
                    androidx.compose.material3.LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth().height(2.dp),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = Color.Transparent,
                    )
                }
                
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Info Column
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.Center
                    ) {
                        val title = if (isActive) {
                            val activeAyah = (session as? PlaybackSessionState.Active)?.activeAyah 
                                            ?: (session as? PlaybackSessionState.PausedByUser)?.active?.activeAyah
                            "Ayet $activeAyah"
                        } else if (isCompleted) {
                            "Çalışma Tamamlandı"
                        } else {
                            state.selectedSurah?.name ?: "Hazır"
                        }
                        
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        
                        if (isActive) {
                            val repeatStr = when (session) {
                                is PlaybackSessionState.Active -> "${session.currentRepeat} / ${session.repeatTarget} Tekrar"
                                is PlaybackSessionState.PausedByUser -> "${session.active.currentRepeat} / ${session.active.repeatTarget} Tekrar"
                                else -> ""
                            }
                            Text(
                                text = repeatStr,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        } else if (state.canStart) {
                            Text(
                                text = "${state.startAyah}-${state.endAyah} arası",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Action Buttons
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (isActive) {
                            IconButton(
                                onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); onStopClick() },
                                modifier = Modifier
                                    .size(44.dp)
                                    .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f), CircleShape)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Stop,
                                    contentDescription = "Durdur",
                                    tint = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }

                        if (isCompleted) {
                            Surface(
                                onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); onPlayClick() },
                                shape = RoundedCornerShape(16.dp),
                                color = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.height(48.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.PlayArrow,
                                        contentDescription = "Tekrar Başlat",
                                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Text(
                                        text = "Tekrar",
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                        } else {
                            Surface(
                                onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); onPlayClick() },
                                enabled = isActive || state.canStart,
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(52.dp),
                                shadowElevation = 4.dp
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                        contentDescription = if (isPlaying) "Duraklat" else "Başlat",
                                        tint = MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── Settings Sheet ──────────────────────────────────────────────────────────

@Composable
private fun DownloadPromptDialog(
    onDownloadAndPlay: (Boolean) -> Unit,
    onJustPlay: (Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    var dontShowAgain by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Sureyi İndir") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Bu sure henüz indirilmemiş. Çevrimdışı dinlemek ve kota tasarrufu için indirmek ister misiniz?")
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { dontShowAgain = !dontShowAgain }
                ) {
                    Checkbox(checked = dontShowAgain, onCheckedChange = { dontShowAgain = it })
                    Text(
                        text = "Bir daha sorma",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onDownloadAndPlay(dontShowAgain) }) {
                Text("İndir ve Oynat")
            }
        },
        dismissButton = {
            TextButton(onClick = { onJustPlay(dontShowAgain) }) {
                Text("Sadece Oynat")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun SettingsSheet(
    state: PracticeUiState,
    viewModel: PracticeViewModel,
    resolvedDarkTheme: Boolean,
    onDismiss: () -> Unit,
) {
    var showTranscriptionInfo by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = "Ayarlar",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Text("Görünüm", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
            HorizontalDivider()

            SwitchRow(
                label = "Koyu tema",
                checked = resolvedDarkTheme,
                onCheckedChange = { 
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.toggleDarkTheme(resolvedDarkTheme) 
                },
            )
            
            SettingSlider(
                label = "Arapça yazı boyutu",
                valueLabel = "${state.settings.arabicTextSizeSp.toInt()}sp",
                value = state.settings.arabicTextSizeSp,
                onValueChange = {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    viewModel.setArabicTextSizeSp(it)
                },
                valueRange = 24f..38f,
                steps = 6,
            )

            Spacer(modifier = Modifier.height(8.dp))
            Text("Okuma & İçerik", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
            HorizontalDivider()

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "Okunuş", style = MaterialTheme.typography.bodyLarge)
                        IconButton(
                            onClick = { 
                                haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                                showTranscriptionInfo = !showTranscriptionInfo 
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Info,
                                contentDescription = "Bilgi",
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    Switch(
                        checked = state.settings.showTranscription,
                        onCheckedChange = { 
                            haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                            viewModel.toggleTranscription() 
                        }
                    )
                }
                if (showTranscriptionInfo) {
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Arapça bilmeyenler için ayetlerin Latin harfleriyle okunuşunu gösterir. Ezber sürecinde sadece yardımcı olarak kullanılması önerilir.",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(8.dp),
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Meal",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = state.settings.translationAuthorId == "6",
                        onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.setTranslationAuthor("6") },
                        label = { Text("TR") },
                    )
                    FilterChip(
                        selected = state.settings.translationAuthorId == "32",
                        onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.setTranslationAuthor("32") },
                        label = { Text("EN") },
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text("İndirmeler & Önbellek", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
            HorizontalDivider()

            SwitchRow(
                label = "İndirme uyarısını göster",
                checked = state.settings.showDownloadPrompt,
                onCheckedChange = { 
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.setShowDownloadPrompt(it) 
                },
            )

            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                val isDownloading = state.downloadState is DownloadState.InProgress
                TextButton(
                    onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.downloadSelectedSurah() },
                    enabled = !isDownloading,
                ) {
                    if (isDownloading) {
                        CircularProgressIndicator(
                            modifier = Modifier
                                .size(16.dp)
                                .padding(end = 6.dp),
                            strokeWidth = 2.dp,
                        )
                    }
                    Text("Seçili sureyi indir")
                }
                TextButton(
                    onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.downloadAllSurahs() },
                    enabled = !isDownloading,
                ) {
                    Text("Tümünü indir")
                }
                TextButton(
                    onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.clearCache() },
                    enabled = !isDownloading,
                ) {
                    Text(
                        "Önbelleği temizle",
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

// ─── Reusable components ─────────────────────────────────────────────────────

@Composable
private fun SettingSlider(
    label: String,
    valueLabel: String,
    value: Float,
    onValueChange: (Float) -> Unit,
    valueRange: ClosedFloatingPointRange<Float>,
    steps: Int,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = label, style = MaterialTheme.typography.bodyLarge)
            Text(
                text = valueLabel,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = valueRange,
            steps = steps,
        )
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyLarge)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AyahRangeSheet(
    state: PracticeUiState,
    viewModel: PracticeViewModel,
    onDismiss: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        dragHandle = { BottomSheetDefaults.DragHandle() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight(0.85f)
                .padding(horizontal = 16.dp)
        ) {
            Text(
                "Ayet Aralığı",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Shortcuts
            Text("Kısayollar", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickSelectPill("1. Ayet") { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.setStartToFirst() }
                QuickSelectPill("Son Ayet") { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.setEndToSurahEnd() }
                QuickSelectPill("Sayfa Başı") { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.setStartToPageStart() }
                QuickSelectPill("Sayfa Sonu") { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.setEndToPageEnd() }
                QuickSelectPill("Tüm Sure") { haptic.performHapticFeedback(HapticFeedbackType.Confirm); viewModel.selectSurahRange() }
            }

            Spacer(modifier = Modifier.height(16.dp))

            val verseCount = state.selectedSurah?.verseCount ?: 0

            // Start Ayah Grid
            Text("Başlangıç: ${state.startAyah}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            LazyVerticalGrid(
                columns = GridCells.Fixed(5),
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(verseCount) { index ->
                    val verseNum = index + 1
                    val isSelected = verseNum == state.startAyah
                    val inRange = verseNum in state.startAyah..state.endAyah
                    Surface(
                        onClick = { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); viewModel.setStartAyah(verseNum) },
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primary else if (inRange) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else MaterialTheme.colorScheme.surfaceVariant,
                        border = if (isSelected) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null,
                        modifier = Modifier.aspectRatio(1f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                verseNum.toString(),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else if (inRange) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // End Ayah Grid
            Text("Bitiş: ${state.endAyah}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            LazyVerticalGrid(
                columns = GridCells.Fixed(5),
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(verseCount) { index ->
                    val verseNum = index + 1
                    val isSelected = verseNum == state.endAyah
                    val inRange = verseNum in state.startAyah..state.endAyah
                    val disabled = verseNum < state.startAyah
                    Surface(
                        onClick = { if (!disabled) { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); viewModel.setEndAyah(verseNum) } },
                        shape = RoundedCornerShape(8.dp),
                        color = if (disabled) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f) else if (isSelected) MaterialTheme.colorScheme.primary else if (inRange) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else MaterialTheme.colorScheme.surfaceVariant,
                        border = if (isSelected) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null,
                        modifier = Modifier.aspectRatio(1f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                verseNum.toString(),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (disabled) MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f) else if (isSelected) MaterialTheme.colorScheme.onPrimary else if (inRange) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            androidx.compose.material3.Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Uygula", style = MaterialTheme.typography.titleMedium)
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RepeatSelectionSheet(
    currentRepeat: Int,
    onRepeatSelected: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    var customText by remember { mutableStateOf("") }
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        dragHandle = { BottomSheetDefaults.DragHandle() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp)
        ) {
            Text(
                "Tekrar Sayısı",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            val presetRepeats = listOf(1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100)
            
            LazyVerticalGrid(
                columns = GridCells.Fixed(4),
                modifier = Modifier.height(200.dp),
                contentPadding = PaddingValues(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(presetRepeats) { repeatVal ->
                    val isSelected = repeatVal == currentRepeat
                    Surface(
                        onClick = { haptic.performHapticFeedback(HapticFeedbackType.Confirm); onRepeatSelected(repeatVal) },
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.aspectRatio(1.5f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                repeatVal.toString(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = customText,
                onValueChange = { customText = it.take(3) },
                label = { Text("Özel (Örn: 12)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { 
                    customText.toIntOrNull()?.let { 
                        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                        onRepeatSelected(it) 
                    } 
                }),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun QuickSelectPill(
    text: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(6.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium.copy(
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium
            )
        )
    }
}

// ─── Ayah List ───────────────────────────────────────────────────────────────

@Composable
private fun PageHeaderDivider(pageNumber: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.outlineVariant
        )
        Text(
            text = "  Sayfa $pageNumber  ",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
        )
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.outlineVariant
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AyahList(
    ayahs: List<AyahWithDetails>,
    selectedPage: Int,
    activeAyah: Int?,
    startAyah: Int,
    endAyah: Int,
    showTranscription: Boolean,
    arabicTextSizeSp: Float,
    isSelectionMode: Boolean,
    onSelectionModeToggle: (Boolean) -> Unit,
    onPageSelected: (Int) -> Unit,
    onPageSwiped: (Int) -> Unit,
    onAyahClick: (AyahWithDetails) -> Unit,
    onSetStart: (Int) -> Unit,
    onSetStartAndEnd: (Int) -> Unit,
    onSetEnd: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val grouped = remember(ayahs) { ayahs.groupBy { it.page } }
    val pages = remember(grouped) { grouped.keys.sorted().toList() }
    
    if (pages.isEmpty()) return

    val initialPage = pages.indexOf(selectedPage).takeIf { it >= 0 } ?: 0
    val pagerState = rememberPagerState(
        initialPage = initialPage,
        pageCount = { pages.size }
    )

    LaunchedEffect(selectedPage) {
        val targetIndex = pages.indexOf(selectedPage)
        if (targetIndex >= 0 && targetIndex != pagerState.currentPage && !pagerState.isScrollInProgress) {
            pagerState.animateScrollToPage(targetIndex)
        }
    }

    LaunchedEffect(pagerState.currentPage) {
        if (pages.isNotEmpty() && !pagerState.isScrollInProgress) {
            val currentPageNum = pages[pagerState.currentPage]
            if (currentPageNum != selectedPage) {
                onPageSwiped(currentPageNum)
            }
        }
    }

    LaunchedEffect(activeAyah) {
        if (activeAyah != null) {
            val ayah = ayahs.firstOrNull { it.number == activeAyah }
            if (ayah != null) {
                val targetIndex = pages.indexOf(ayah.page)
                if (targetIndex >= 0 && targetIndex != pagerState.currentPage) {
                    pagerState.animateScrollToPage(targetIndex)
                }
            }
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        if (isSelectionMode) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(8.dp))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Aralık Seçiliyor",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                TextButton(onClick = { onSelectionModeToggle(false) }) {
                    Text("Tamamla")
                }
            }
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
            key = { pages[it] }
        ) { pageIndex ->
            val pageNumber = pages[pageIndex]
            val pageAyahs = grouped[pageNumber] ?: emptyList()
            
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp)
            ) {
                item(key = "page_header_$pageNumber") {
                    PageHeaderDivider(pageNumber = pageNumber)
                }
                items(pageAyahs, key = { "${it.surahId}:${it.number}" }) { ayah ->
                    AyahCard(
                        ayah = ayah,
                        active = ayah.number == activeAyah,
                        inRange = ayah.number in startAyah..endAyah,
                        isSelectionMode = isSelectionMode,
                        startAyah = startAyah,
                        endAyah = endAyah,
                        showTranscription = showTranscription,
                        arabicTextSizeSp = arabicTextSizeSp,
                        onClick = {
                            if (isSelectionMode) {
                                val distToStart = kotlin.math.abs(ayah.number - startAyah)
                                val distToEnd = kotlin.math.abs(ayah.number - endAyah)
                                if (ayah.number < startAyah) onSetStart(ayah.number)
                                else if (ayah.number > endAyah) onSetEnd(ayah.number)
                                else if (distToStart < distToEnd) onSetStart(ayah.number)
                                else onSetEnd(ayah.number)
                            } else {
                                onAyahClick(ayah)
                            }
                        },
                        onSetStart = { onSetStart(ayah.number) },
                        onSetStartAndEnd = { onSetStartAndEnd(ayah.number) },
                        onSetEnd = { onSetEnd(ayah.number) }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AyahCard(
    ayah: AyahWithDetails,
    active: Boolean,
    inRange: Boolean,
    isSelectionMode: Boolean,
    startAyah: Int,
    endAyah: Int,
    showTranscription: Boolean,
    arabicTextSizeSp: Float,
    onClick: () -> Unit,
    onSetStart: () -> Unit,
    onSetStartAndEnd: () -> Unit,
    onSetEnd: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current
    
    val borderColor = if (active) MaterialTheme.colorScheme.primary else Color.Transparent
    val backgroundColor = if (active) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
    else if (inRange) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
    else MaterialTheme.colorScheme.surface

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .combinedClickable(
                onClick = onClick,
                onLongClick = {
                    if (!isSelectionMode) {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        showMenu = true
                    }
                }
            )
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (isSelectionMode) {
            val isSelected = ayah.number == startAyah || ayah.number == endAyah
            RadioButton(
                selected = isSelected,
                onClick = null // handled by row click
            )
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${ayah.surahId}:${ayah.number}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            if (active) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.VolumeUp,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            Text(
                text = ayah.arabic,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Right,
                fontFamily = ArabicFontFamily,
                fontSize = arabicTextSizeSp.sp,
                lineHeight = (arabicTextSizeSp * 1.6f).sp,
                fontWeight = FontWeight.Medium,
                softWrap = true,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        
        if (showTranscription && ayah.transcription.isNotBlank()) {
            Text(
                text = ayah.transcription,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                fontStyle = FontStyle.Italic
            )
        }
        
        Text(
            text = ayah.translation,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            lineHeight = 24.sp
        )

        DropdownMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false }
        ) {
            DropdownMenuItem(
                text = { Text("Başlangıç Yap") },
                onClick = {
                    onSetStartAndEnd() // Best practice: start yapınca bitişi de eşitle
                    showMenu = false
                }
            )
            DropdownMenuItem(
                text = { Text("Bitiş Yap") },
                onClick = {
                    onSetEnd()
                    showMenu = false
                }
            )
        }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SurahSelectionSheet(
    surahs: List<SurahEntity>,
    selectedSurahId: Int,
    onSurahSelected: (Int) -> Unit,
    onDismiss: () -> Unit,
) {
    var searchQuery by rememberSaveable { mutableStateOf("") }
    val filteredSurahs = remember(surahs, searchQuery) {
        if (searchQuery.isBlank()) surahs
        else surahs.filter { it.name.matchesSurahQuery(searchQuery) }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        dragHandle = { BottomSheetDefaults.DragHandle() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight(0.85f)
                .padding(horizontal = 16.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                placeholder = { Text("Sure ara...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Temizle")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                items(filteredSurahs, key = { it.id }) { surah ->
                    val isSelected = surah.id == selectedSurahId
                    Surface(
                        onClick = { onSurahSelected(surah.id) },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Text(
                                text = surah.id.toString(),
                                style = MaterialTheme.typography.labelLarge,
                                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.width(28.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = surah.name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                                Text(
                                    text = "${surah.verseCount} Ayet",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (isSelected) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── Error strip ─────────────────────────────────────────────────────────────

@Composable
private fun ErrorStrip(message: String, onDismiss: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(8.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = message,
            color = MaterialTheme.colorScheme.onErrorContainer,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyMedium,
        )
        IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Kapat",
                tint = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

// ─── Reusable components ─────────────────────────────────────────────────────
