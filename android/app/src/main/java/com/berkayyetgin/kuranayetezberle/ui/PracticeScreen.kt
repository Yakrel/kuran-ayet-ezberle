package com.berkayyetgin.kuranayetezberle.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.Velocity
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
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.berkayyetgin.kuranayetezberle.R
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.data.SurahEntity
import com.berkayyetgin.kuranayetezberle.domain.PlaybackSessionState
import com.berkayyetgin.kuranayetezberle.ui.theme.AppTheme
import java.util.Locale
import kotlinx.coroutines.delay

private val ArabicFontFamily = FontFamily(Font(R.font.uthmanic_hafs_v22))
private val TurkishLocale: Locale = Locale.forLanguageTag("tr-TR")

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
    return this.lowercase(TurkishLocale)
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
    var showAyahRangeSelection by rememberSaveable { mutableStateOf(false) }
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
        val onPlayClick: () -> Unit = {
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
        }

        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = MaterialTheme.colorScheme.background,
            contentWindowInsets = WindowInsets(0, 0, 0, 0),
            topBar = {
                PracticeTopBar(
                    state = state,
                    onSurahClick = { showSurahSelection = true },
                    onNextSurah = viewModel::nextSurah,
                    onPrevSurah = viewModel::previousSurah,
                    onAyahRangeClick = { showAyahRangeSelection = true },
                    onRepeatClick = { showRepeatSelection = true },
                    onSettingsClick = { showSettings = true },
                    onSpeedClick = {
                        val currentIndex = SPEED_STEPS.indexOf(state.settings.playbackSpeed)
                        val nextIndex = if (currentIndex >= 0) {
                            (currentIndex + 1) % SPEED_STEPS.size
                        } else {
                            SPEED_STEPS.indexOf(1.0f)
                        }
                        viewModel.setSpeed(SPEED_STEPS[nextIndex])
                    },
                )
            },
            bottomBar = {
                PlaybackBar(
                    state = state,
                    onPlayClick = onPlayClick,
                    onStopClick = viewModel::stop,
                    onDownloadClick = { viewModel.downloadSelectedSurah() },
                )
            },
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = innerPadding.calculateTopPadding())
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                state.error?.let { ErrorStrip(it, viewModel::clearError) }

                AyahList(
                    ayahs = state.ayahs,
                    selectedPage = state.selectedPage,
                    activeAyah = state.activeAyah,
                    startAyah = state.startAyah,
                    endAyah = state.endAyah,
                    showTranscription = state.settings.showTranscription,
                    arabicTextSizeSp = state.settings.arabicTextSizeSp,
                    canSwipeToPreviousSurah = state.selectedSurahId > 1,
                    canSwipeToNextSurah = state.selectedSurahId < 114,
                    onPageSwiped = viewModel::onPageSwipe,
                    onPreviousSurah = viewModel::previousSurah,
                    onNextSurah = viewModel::nextSurah,
                    onSetStartAndEnd = viewModel::setStartAndEndAyah,
                    onSetEnd = viewModel::setEndAyah,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        if (showDownloadPrompt) {
            DownloadPromptDialog(
                surahName = state.selectedSurah?.name,
                onDownloadAndPlay = { doNotShowAgain ->
                    if (doNotShowAgain) viewModel.setShowDownloadPrompt(false)
                    viewModel.downloadSelectedSurah(playAfterDownload = true)
                    showDownloadPrompt = false
                },
                onJustPlay = { doNotShowAgain ->
                    if (doNotShowAgain) viewModel.setShowDownloadPrompt(false)
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

        if (showAyahRangeSelection) {
            AyahRangeSheet(
                state = state,
                viewModel = viewModel,
                onDismiss = { showAyahRangeSelection = false },
            )
        }

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

@Composable
private fun PracticeTopBar(
    state: PracticeUiState,
    onSurahClick: () -> Unit,
    onNextSurah: () -> Unit,
    onPrevSurah: () -> Unit,
    onAyahRangeClick: () -> Unit,
    onRepeatClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onSpeedClick: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    Surface(
        modifier = Modifier
            .fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = WindowInsets.safeDrawing.asPaddingValues().calculateTopPadding())
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onPrevSurah()
                    },
                    enabled = state.selectedSurahId > 1,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(Icons.Filled.ChevronLeft, contentDescription = "Önceki sure")
                }

                Surface(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                        onSurahClick()
                    },
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                    modifier = Modifier.weight(1f),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(42.dp)
                            .padding(horizontal = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Text(
                                text = state.selectedSurah?.let { "${it.id}. ${it.name}" } ?: "Sure seç",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                text = state.selectedSurah?.let { "${it.verseCount} ayet" } ?: "Listeyi aç",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                            )
                        }
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.List,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }

                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onNextSurah()
                    },
                    enabled = state.selectedSurahId < 114,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(Icons.Filled.ChevronRight, contentDescription = "Sonraki sure")
                }

                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                        onSettingsClick()
                    },
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(imageVector = Icons.Filled.Settings, contentDescription = "Ayarlar")
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TopBarChip(
                    label = "Ayet",
                    value = "${state.startAyah}-${state.endAyah}",
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                        onAyahRangeClick()
                    },
                    modifier = Modifier.weight(1.2f),
                )
                TopBarChip(
                    label = "Tekrar",
                    value = state.settings.repeatCount.toString(),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                        onRepeatClick()
                    },
                    modifier = Modifier.weight(1f),
                )
                TopBarChip(
                    label = "Hız",
                    value = state.settings.playbackSpeed.toSpeedLabel(),
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onSpeedClick()
                    },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun TopBarChip(
    label: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = modifier
            .height(38.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 3.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.85f),
                maxLines = 1,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/**
 * Shows either a spinning progress indicator (while downloading), a filled check-circle icon
 * (when the surah is cached), or a download cloud icon (when not cached / idle).
 * Tapping the icon triggers a download of the selected surah.
 */
@Composable
private fun CacheStatusButton(
    surahName: String?,
    isCached: Boolean,
    downloadState: DownloadState,
    onDownload: () -> Unit,
) {
    val inProgress = downloadState as? DownloadState.InProgress
    val label = when {
        inProgress != null -> inProgress.percentLabel ?: "İniyor"
        isCached -> "Hazır"
        else -> "${surahName ?: "Sure"} indir"
    }

    Surface(
        onClick = onDownload,
        enabled = !isCached && inProgress == null,
        shape = RoundedCornerShape(8.dp),
        color = if (isCached) {
            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.7f)
        } else {
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.65f)
        },
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp)
        ) {
            Box(
                modifier = Modifier.size(22.dp),
                contentAlignment = Alignment.Center,
            ) {
                when {
                    inProgress != null -> {
                        val fraction = inProgress.fraction
                        if (fraction != null) {
                            CircularProgressIndicator(
                                progress = { fraction },
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        } else {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                    downloadState is DownloadState.Done || isCached -> {
                        Icon(
                            imageVector = Icons.Filled.CheckCircle,
                            contentDescription = "Sure cihazda hazır",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                    else -> {
                        Icon(
                            imageVector = Icons.Filled.CloudDownload,
                            contentDescription = "${surahName ?: "Sure"} indir",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            }

            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = if (isCached) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.width(68.dp),
            )
        }
    }
}

// ─── Playback Controls ───────────────────────────────────────────────────────

@Composable
private fun PlaybackBar(
    state: PracticeUiState,
    onPlayClick: () -> Unit,
    onStopClick: () -> Unit,
    onDownloadClick: () -> Unit,
) {
    val session = state.sessionState
    val isPlaying = session is PlaybackSessionState.Active
    val isPaused = session is PlaybackSessionState.PausedByUser
    val isCompleted = session is PlaybackSessionState.Completed
    val isActive = isPlaying || isPaused
    val haptic = LocalHapticFeedback.current

    val activeRepeat = when (session) {
        is PlaybackSessionState.Active -> session.currentRepeat to session.repeatTarget
        is PlaybackSessionState.PausedByUser -> session.active.currentRepeat to session.active.repeatTarget
        else -> 0 to 1
    }
    val activeAyah = when (session) {
        is PlaybackSessionState.Active -> session.activeAyah
        is PlaybackSessionState.PausedByUser -> session.active.activeAyah
        else -> null
    }
    val title = when {
        isActive -> "Ayet $activeAyah"
        isCompleted -> "Çalışma tamamlandı"
        session is PlaybackSessionState.Error -> "Hata oluştu"
        else -> state.selectedSurah?.name ?: "Hazır"
    }
    val subtitle = when {
        isActive -> "${activeRepeat.first} / ${activeRepeat.second} tekrar • ${state.settings.playbackSpeed.toSpeedLabel()}"
        isCompleted -> "Tekrar başlatmaya hazır"
        state.canStart -> "Ayet ${state.startAyah}-${state.endAyah} • ${state.settings.repeatCount} tekrar • ${state.settings.playbackSpeed.toSpeedLabel()}"
        else -> "Ayet aralığı hazır değil"
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
        shadowElevation = 2.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 10.dp, vertical = 7.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (isActive) {
                val repeatTarget = activeRepeat.second.coerceAtLeast(1)
                val progress = (activeRepeat.first.toFloat() / repeatTarget.toFloat()).coerceIn(0f, 1f)
                androidx.compose.material3.LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(2.dp),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                )
            }

            DownloadProgressStrip(state.downloadState)

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                if (!isActive) {
                    CacheStatusButton(
                        surahName = state.selectedSurah?.name,
                        isCached = state.isSelectedSurahCached,
                        downloadState = state.downloadState,
                        onDownload = onDownloadClick,
                    )
                }

                if (isActive) {
                    IconButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                            onStopClick()
                        },
                        modifier = Modifier
                            .size(40.dp)
                            .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.35f), CircleShape),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Stop,
                            contentDescription = "Durdur",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }

                Surface(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                        onPlayClick()
                    },
                    enabled = isActive || state.canStart,
                    shape = CircleShape,
                    color = if (isActive || state.canStart) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    },
                    modifier = Modifier.size(50.dp),
                    shadowElevation = 2.dp,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = if (isPlaying) "Duraklat" else "Başlat",
                            tint = if (isActive || state.canStart) {
                                MaterialTheme.colorScheme.onPrimary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            modifier = Modifier.size(26.dp),
                        )
                    }
                }
            }
        }
    }
}

// ─── Settings Sheet ──────────────────────────────────────────────────────────

@Composable
private fun DownloadPromptDialog(
    surahName: String?,
    onDownloadAndPlay: (Boolean) -> Unit,
    onJustPlay: (Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    var doNotShowAgain by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("${surahName ?: "Sure"} indirilsin mi?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Bu sure cihazda hazır değil. Çevrimdışı dinlemek ve kota tasarrufu için şimdi indirebilirsin.")
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { doNotShowAgain = !doNotShowAgain }
                ) {
                    Checkbox(checked = doNotShowAgain, onCheckedChange = { doNotShowAgain = it })
                    Text(
                        text = "Bir daha sorma",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onDownloadAndPlay(doNotShowAgain) }) {
                Text("İndir ve Oynat")
            }
        },
        dismissButton = {
            TextButton(onClick = { onJustPlay(doNotShowAgain) }) {
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
    val settingsScrollState = rememberScrollState()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.88f)
                .navigationBarsPadding()
                .verticalScroll(settingsScrollState)
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
            
            ArabicTextSizeSlider(
                value = state.settings.arabicTextSizeSp,
                onValueChange = {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    viewModel.setArabicTextSizeSp(it)
                },
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

            DownloadManagerCard(
                state = state,
                onDownloadSelected = {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.downloadSelectedSurah()
                },
                onDownloadAll = {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.downloadAllSurahs()
                },
                onClearCache = {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.clearCache()
                },
            )
        }
    }
}

// ─── Reusable components ─────────────────────────────────────────────────────

@Composable
private fun ArabicTextSizeSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = "Arapça yazı boyutu", style = MaterialTheme.typography.bodyLarge)
            Text(
                text = "${value.toInt()}sp",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = 24f..38f,
            steps = 6,
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun AyahRangeSheet(
    state: PracticeUiState,
    viewModel: PracticeViewModel,
    onDismiss: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    var selectingStart by rememberSaveable(state.selectedSurahId) { mutableStateOf(true) }
    val verseCount = state.selectedSurah?.verseCount ?: 0

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        dragHandle = { BottomSheetDefaults.DragHandle() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight(0.85f)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        "Ayet Aralığı",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "${state.selectedSurah?.name ?: "Sure"} • ${state.startAyah}-${state.endAyah}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                TextButton(onClick = onDismiss) {
                    Text("Kapat")
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = selectingStart,
                    onClick = { selectingStart = true },
                    label = { Text("Başlangıç ${state.startAyah}") },
                    modifier = Modifier.weight(1f),
                )
                FilterChip(
                    selected = !selectingStart,
                    onClick = { selectingStart = false },
                    label = { Text("Bitiş ${state.endAyah}") },
                    modifier = Modifier.weight(1f),
                )
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.38f),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = "Aralığı belirlemek için önce Başlangıç ya da Bitiş'i seçip ardından ayet numarasına dokunabilirsiniz.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        maxLines = 2,
                    )
                }
            }

            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickSelectPill("Bu Sayfa") {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.selectPageRange()
                }
                QuickSelectPill("1. Ayet") {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.setStartToFirst()
                    selectingStart = false
                }
                QuickSelectPill("Son Ayet") {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.setEndToSurahEnd()
                    selectingStart = true
                }
                QuickSelectPill("Sayfa Başı") {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.setStartToPageStart()
                    selectingStart = false
                }
                QuickSelectPill("Sayfa Sonu") {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.setEndToPageEnd()
                    selectingStart = true
                }
                QuickSelectPill("Tüm Sure") {
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    viewModel.selectSurahRange()
                }
            }

            LazyVerticalGrid(
                columns = GridCells.Fixed(5),
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(verseCount) { index ->
                    val verseNum = index + 1
                    val isStart = verseNum == state.startAyah
                    val isEnd = verseNum == state.endAyah
                    val inRange = verseNum in state.startAyah..state.endAyah
                    val selectedForMode = if (selectingStart) isStart else isEnd
                    Surface(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            if (selectingStart) {
                                viewModel.setStartAyah(verseNum)
                                selectingStart = false
                            } else if (verseNum < state.startAyah) {
                                viewModel.setStartAyah(verseNum)
                            } else {
                                viewModel.setEndAyah(verseNum)
                            }
                        },
                        shape = RoundedCornerShape(8.dp),
                        color = when {
                            selectedForMode -> MaterialTheme.colorScheme.primary
                            isStart || isEnd -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.75f)
                            inRange -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        },
                        border = when {
                            selectedForMode -> BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                            isStart || isEnd -> BorderStroke(1.dp, MaterialTheme.colorScheme.secondary)
                            inRange -> BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                            else -> null
                        },
                        modifier = Modifier.aspectRatio(1f)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            Text(
                                verseNum.toString(),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedForMode) {
                                    MaterialTheme.colorScheme.onPrimary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                            )
                            if (isStart || isEnd) {
                                Text(
                                    text = when {
                                        isStart && isEnd -> "Tek"
                                        isStart -> "Baş"
                                        else -> "Bit"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (selectedForMode) {
                                        MaterialTheme.colorScheme.onPrimary
                                    } else {
                                        MaterialTheme.colorScheme.onSecondaryContainer
                                    },
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                }
            }

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
    canSwipeToPreviousSurah: Boolean,
    canSwipeToNextSurah: Boolean,
    onPageSwiped: (Int) -> Unit,
    onPreviousSurah: () -> Unit,
    onNextSurah: () -> Unit,
    onSetStartAndEnd: (Int) -> Unit,
    onSetEnd: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val grouped = remember(ayahs) { ayahs.groupBy { it.page } }
    val pages = remember(grouped) { grouped.keys.sorted().toList() }
    val edgeSwipeThresholdPx = with(LocalDensity.current) { 72.dp.toPx() }
    
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

    LaunchedEffect(pagerState, pages, selectedPage) {
        snapshotFlow { pagerState.currentPage to pagerState.isScrollInProgress }
            .collect { (currentPage, isScrollInProgress) ->
                if (pages.isNotEmpty() && !isScrollInProgress) {
                    val currentPageNum = pages.getOrNull(currentPage) ?: return@collect
                    if (currentPageNum != selectedPage) {
                        onPageSwiped(currentPageNum)
                    }
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

    val edgeSwipeConnection = remember(
        pagerState,
        pages,
        edgeSwipeThresholdPx,
        canSwipeToPreviousSurah,
        canSwipeToNextSurah,
        onPreviousSurah,
        onNextSurah,
    ) {
        object : NestedScrollConnection {
            private var edgeDragPx = 0f

            override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                if (source != NestedScrollSource.UserInput || pages.isEmpty()) return Offset.Zero

                val atFirstPage = pagerState.currentPage == 0
                val atLastPage = pagerState.currentPage == pages.lastIndex
                edgeDragPx = when {
                    atFirstPage && canSwipeToPreviousSurah && available.x > 0f -> edgeDragPx + available.x
                    atLastPage && canSwipeToNextSurah && available.x < 0f -> edgeDragPx + available.x
                    available.x != 0f -> 0f
                    else -> edgeDragPx
                }
                val crossedPreviousThreshold = edgeDragPx > edgeSwipeThresholdPx && canSwipeToPreviousSurah
                val crossedNextThreshold = edgeDragPx < -edgeSwipeThresholdPx && canSwipeToNextSurah
                return if (crossedPreviousThreshold || crossedNextThreshold) {
                    Offset(available.x, 0f)
                } else {
                    Offset.Zero
                }
            }

            override suspend fun onPostFling(consumed: Velocity, available: Velocity): Velocity {
                when {
                    edgeDragPx > edgeSwipeThresholdPx && canSwipeToPreviousSurah -> onPreviousSurah()
                    edgeDragPx < -edgeSwipeThresholdPx && canSwipeToNextSurah -> onNextSurah()
                }
                edgeDragPx = 0f
                return Velocity.Zero
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .nestedScroll(edgeSwipeConnection)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
            key = { pages[it] }
        ) { pageIndex ->
            val pageNumber = pages[pageIndex]
            val pageAyahs = grouped[pageNumber] ?: emptyList()
            val listState = rememberLazyListState()

            LaunchedEffect(activeAyah, pageNumber, pageAyahs) {
                val targetIndex = pageAyahs.indexOfFirst { it.number == activeAyah }
                if (targetIndex >= 0) {
                    listState.animateScrollToItem(targetIndex + 1)
                }
            }

            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 8.dp, bottom = 116.dp)
            ) {
                item(key = "page_header_$pageNumber") {
                    PageHeaderDivider(pageNumber = pageNumber)
                }
                items(pageAyahs, key = { "${it.surahId}:${it.number}" }) { ayah ->
                    AyahCard(
                        ayah = ayah,
                        active = ayah.number == activeAyah,
                        inRange = ayah.number in startAyah..endAyah,
                        isRangeStart = ayah.number == startAyah,
                        isRangeEnd = ayah.number == endAyah,
                        showTranscription = showTranscription,
                        arabicTextSizeSp = arabicTextSizeSp,
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
    isRangeStart: Boolean,
    isRangeEnd: Boolean,
    showTranscription: Boolean,
    arabicTextSizeSp: Float,
    onSetStartAndEnd: () -> Unit,
    onSetEnd: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current
    val isRangeBoundary = isRangeStart || isRangeEnd
    val rangeMarker = when {
        isRangeStart && isRangeEnd -> "Seçili"
        isRangeStart -> "Başlangıç"
        isRangeEnd -> "Bitiş"
        else -> null
    }

    val borderColor = when {
        active -> MaterialTheme.colorScheme.primary
        isRangeBoundary -> MaterialTheme.colorScheme.secondary
        inRange -> MaterialTheme.colorScheme.primary.copy(alpha = 0.28f)
        else -> Color.Transparent
    }
    val backgroundColor = when {
        active -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f)
        isRangeBoundary -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.42f)
        inRange -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.18f)
        else -> MaterialTheme.colorScheme.surface
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .border(if (active || isRangeBoundary) 2.dp else 1.dp, borderColor, RoundedCornerShape(12.dp))
            .combinedClickable(
                onClick = {},
                onLongClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    showMenu = true
                }
            )
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
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
                rangeMarker?.let { marker ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.75f),
                    ) {
                        Text(
                            text = marker,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            maxLines = 1,
                        )
                    }
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
                        onSetStartAndEnd()
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
