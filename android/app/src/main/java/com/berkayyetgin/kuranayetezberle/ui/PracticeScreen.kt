package com.berkayyetgin.kuranayetezberle.ui

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.berkayyetgin.kuranayetezberle.R
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
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

    val resolvedDarkTheme = state.settings.darkTheme ?: isSystemInDarkTheme()

    // Auto-clear download Done state after 2 seconds so the UI returns to idle.
    LaunchedEffect(state.downloadState) {
        if (state.downloadState is DownloadState.Done) {
            delay(2_000)
            viewModel.clearDownloadDone()
        }
    }

    AppTheme(darkTheme = resolvedDarkTheme) {
        Scaffold(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
            contentWindowInsets = WindowInsets.safeDrawing,
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(innerPadding)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PracticeHeader(
                    state = state,
                    viewModel = viewModel,
                    onSettingsClick = { showSettings = true },
                )
                PlaybackControls(state, viewModel)
                state.error?.let { ErrorStrip(it, viewModel::clearError) }
                AyahList(
                    ayahs = state.visibleAyahs,
                    activeAyah = state.activeAyah,
                    showTranscription = state.settings.showTranscription,
                    arabicTextSizeSp = state.settings.arabicTextSizeSp,
                    modifier = Modifier.weight(1f),
                )
            }
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun PracticeHeader(
    state: PracticeUiState,
    viewModel: PracticeViewModel,
    onSettingsClick: () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    var surahSearchQuery by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(8.dp))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = {
                    expanded = !expanded
                    if (!expanded) surahSearchQuery = ""
                },
                modifier = Modifier.weight(1f),
            ) {
                OutlinedTextField(
                    value = state.selectedSurah?.let { "${it.id}. ${it.name}" }.orEmpty(),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Sure") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    singleLine = true,
                    modifier = Modifier
                        .menuAnchor()
                        .fillMaxWidth(),
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = {
                        expanded = false
                        surahSearchQuery = ""
                    },
                ) {
                    OutlinedTextField(
                        value = surahSearchQuery,
                        onValueChange = { surahSearchQuery = it },
                        placeholder = { Text("Sure ara...") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    )

                    val filteredSurahs = remember(surahSearchQuery, state.surahs) {
                        if (surahSearchQuery.isBlank()) state.surahs
                        else state.surahs.filter { surah ->
                            surah.name.matchesSurahQuery(surahSearchQuery) ||
                                surah.id.toString() == surahSearchQuery
                        }
                    }

                    if (filteredSurahs.isEmpty()) {
                        DropdownMenuItem(
                            text = {
                                Text(
                                    "Sure bulunamadı",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            },
                            onClick = {},
                            enabled = false,
                        )
                    } else {
                        filteredSurahs.forEach { surah ->
                            DropdownMenuItem(
                                text = { Text("${surah.id}. ${surah.name}") },
                                onClick = {
                                    expanded = false
                                    surahSearchQuery = ""
                                    viewModel.selectSurah(surah.id)
                                },
                            )
                        }
                    }
                }
            }

            // Cache status / download button
            CacheStatusButton(
                isCached = state.isSelectedSurahCached,
                downloadState = state.downloadState,
                onDownload = viewModel::downloadSelectedSurah,
            )

            IconButton(onClick = onSettingsClick) {
                Icon(imageVector = Icons.Filled.Settings, contentDescription = "Ayarlar")
            }
        }

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            itemVerticalAlignment = Alignment.CenterVertically,
        ) {
            NumberField("Baş", state.startAyah, Modifier.width(78.dp)) { viewModel.setStartAyah(it) }
            NumberField("Son", state.endAyah, Modifier.width(78.dp)) { viewModel.setEndAyah(it) }
            NumberField("Tekrar", state.settings.repeatCount, Modifier.width(96.dp)) { viewModel.setRepeatCount(it) }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                val minPage = remember(state.ayahs) { state.ayahs.minOfOrNull { it.page } ?: 1 }
                val maxPage = remember(state.ayahs) { state.ayahs.maxOfOrNull { it.page } ?: 604 }
                IconButton(
                    onClick = { viewModel.setPage(state.selectedPage - 1) },
                    enabled = state.selectedPage > minPage,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowLeft,
                        contentDescription = "Önceki Sayfa",
                        modifier = Modifier.size(24.dp),
                    )
                }
                NumberField("Sayfa", state.selectedPage, Modifier.width(60.dp)) { viewModel.setPage(it) }
                IconButton(
                    onClick = { viewModel.setPage(state.selectedPage + 1) },
                    enabled = state.selectedPage < maxPage,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowRight,
                        contentDescription = "Sonraki Sayfa",
                        modifier = Modifier.size(24.dp),
                    )
                }
            }

            Text(
                text = "${state.startAyah}-${state.endAyah} × ${state.settings.repeatCount}",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
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
    isCached: Boolean,
    downloadState: DownloadState,
    onDownload: () -> Unit,
) {
    Box(
        modifier = Modifier.size(40.dp),
        contentAlignment = Alignment.Center,
    ) {
        when {
            downloadState is DownloadState.InProgress -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    strokeWidth = 2.5.dp,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            downloadState is DownloadState.Done || isCached -> {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = "Önbellekte mevcut",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp),
                )
            }
            else -> {
                IconButton(
                    onClick = onDownload,
                    modifier = Modifier.size(40.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.CloudDownload,
                        contentDescription = "Sureyi indir",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(22.dp),
                    )
                }
            }
        }
    }
}

// ─── Playback Controls ───────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PlaybackControls(state: PracticeUiState, viewModel: PracticeViewModel) {
    val session = state.sessionState
    val isActiveSession = session is PlaybackSessionState.Active ||
        session is PlaybackSessionState.PausedByUser

    if (!isActiveSession) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(12.dp),
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Button(
                onClick = viewModel::start,
                enabled = state.canStart,
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            ) {
                Icon(imageVector = Icons.Filled.PlayArrow, contentDescription = null)
                Spacer(modifier = Modifier.width(6.dp))
                Text("Eğitimi Başlat", fontWeight = FontWeight.Bold)
            }
            Text(
                text = sessionLabel(session),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                    RoundedCornerShape(12.dp),
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // ─ Transport row (pause / stop / repeat info) ─
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    IconButton(
                        onClick = viewModel::pauseOrResume,
                        modifier = Modifier
                            .size(40.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape),
                    ) {
                        Icon(
                            imageVector = if (session is PlaybackSessionState.PausedByUser)
                                Icons.Filled.PlayArrow else Icons.Filled.Pause,
                            contentDescription = if (session is PlaybackSessionState.PausedByUser)
                                "Sürdür" else "Duraklat",
                            tint = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                    IconButton(
                        onClick = viewModel::stop,
                        modifier = Modifier
                            .size(40.dp)
                            .background(MaterialTheme.colorScheme.errorContainer, CircleShape),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Stop,
                            contentDescription = "Durdur",
                            tint = MaterialTheme.colorScheme.onErrorContainer,
                        )
                    }
                }

                // Repeat counter — always shown whether playing or paused
                Column(horizontalAlignment = Alignment.End) {
                    val (repeatLabel, ayahLabel) = when (session) {
                        is PlaybackSessionState.Active ->
                            "Tekrar: ${session.currentRepeat} / ${session.repeatTarget}" to
                                "Ayet: ${session.activeAyah}"
                        is PlaybackSessionState.PausedByUser ->
                            "Tekrar: ${session.active.currentRepeat} / ${session.active.repeatTarget}" to
                                "Duraklatıldı"
                        else -> "" to ""
                    }
                    Text(
                        text = repeatLabel,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = ayahLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // ─ Speed chip row ─
            SpeedChipRow(
                currentSpeed = state.settings.playbackSpeed,
                onSpeedSelected = viewModel::setSpeed,
            )
        }
    }
}

/** Compact row of discrete speed selection chips shown during an active session. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SpeedChipRow(currentSpeed: Float, onSpeedSelected: (Float) -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        itemVerticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Hız",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.align(Alignment.CenterVertically),
        )
        SPEED_STEPS.forEach { speed ->
            FilterChip(
                selected = currentSpeed == speed,
                onClick = { onSpeedSelected(speed) },
                label = { Text(speed.toSpeedLabel(), style = MaterialTheme.typography.labelSmall) },
            )
        }
    }
}

// ─── Settings Sheet ──────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun SettingsSheet(
    state: PracticeUiState,
    viewModel: PracticeViewModel,
    resolvedDarkTheme: Boolean,
    onDismiss: () -> Unit,
) {
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
                fontWeight = FontWeight.SemiBold,
            )
            SettingSlider(
                label = "Arapça yazı",
                valueLabel = "${state.settings.arabicTextSizeSp.toInt()}sp",
                value = state.settings.arabicTextSizeSp,
                onValueChange = viewModel::setArabicTextSizeSp,
                valueRange = 24f..38f,
                steps = 6,
            )
            SwitchRow(
                label = "Okunuş",
                checked = state.settings.showTranscription,
                onCheckedChange = { viewModel.toggleTranscription() },
            )
            SwitchRow(
                label = "Koyu tema",
                checked = resolvedDarkTheme,
                onCheckedChange = { viewModel.toggleDarkTheme(resolvedDarkTheme) },
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Meal",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyLarge,
                )
                FilterChip(
                    selected = state.settings.translationAuthorId == "6",
                    onClick = { viewModel.setTranslationAuthor("6") },
                    label = { Text("TR") },
                )
                FilterChip(
                    selected = state.settings.translationAuthorId == "32",
                    onClick = { viewModel.setTranslationAuthor("32") },
                    label = { Text("EN") },
                )
            }
            HorizontalDivider()
            // Cache management section
            Text(
                text = "Önbellek",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                val isDownloading = state.downloadState is DownloadState.InProgress
                TextButton(
                    onClick = viewModel::downloadAllSurahs,
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
                    Text("Tümünü indir")
                }
                TextButton(
                    onClick = viewModel::clearCache,
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

@Composable
private fun NumberField(
    label: String,
    value: Int,
    modifier: Modifier = Modifier,
    onChange: (Int) -> Unit,
) {
    val focusManager = LocalFocusManager.current
    var isFocused by remember { mutableStateOf(false) }
    var text by remember(value) { mutableStateOf(value.toString()) }

    LaunchedEffect(value) {
        if (!isFocused) text = value.toString()
    }

    OutlinedTextField(
        value = text,
        onValueChange = { next ->
            text = next
            next.toIntOrNull()?.let(onChange)
        },
        label = { Text(label) },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
        singleLine = true,
        modifier = modifier.onFocusChanged { focusState ->
            isFocused = focusState.isFocused
            if (!focusState.isFocused) text = value.toString()
        },
    )
}

// ─── Ayah List ───────────────────────────────────────────────────────────────

@Composable
private fun AyahList(
    ayahs: List<AyahWithDetails>,
    activeAyah: Int?,
    showTranscription: Boolean,
    arabicTextSizeSp: Float,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()

    LaunchedEffect(activeAyah) {
        if (activeAyah != null) {
            val index = ayahs.indexOfFirst { it.number == activeAyah }
            if (index >= 0) listState.animateScrollToItem(index)
        }
    }

    LazyColumn(
        state = listState,
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(bottom = 8.dp),
    ) {
        items(ayahs, key = { "${it.surahId}:${it.number}" }) { ayah ->
            AyahCard(
                ayah = ayah,
                active = ayah.number == activeAyah,
                showTranscription = showTranscription,
                arabicTextSizeSp = arabicTextSizeSp,
            )
        }
    }
}

@Composable
private fun AyahCard(
    ayah: AyahWithDetails,
    active: Boolean,
    showTranscription: Boolean,
    arabicTextSizeSp: Float,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (active) MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surface,
                RoundedCornerShape(8.dp),
            )
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = "${ayah.surahId}:${ayah.number}",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            Text(
                text = ayah.arabic,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Right,
                fontFamily = ArabicFontFamily,
                fontSize = arabicTextSizeSp.sp,
                lineHeight = (arabicTextSizeSp * 1.55f).sp,
                fontWeight = FontWeight.Medium,
                softWrap = true,
            )
        }
        if (showTranscription && ayah.transcription.isNotBlank()) {
            Text(text = ayah.transcription, style = MaterialTheme.typography.bodyMedium)
        }
        Text(text = ayah.translation, style = MaterialTheme.typography.bodyLarge)
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

// ─── Session label ───────────────────────────────────────────────────────────

private fun sessionLabel(state: PlaybackSessionState): String = when (state) {
    PlaybackSessionState.Idle -> "Hazır"
    PlaybackSessionState.Stopped -> "Durduruldu"
    PlaybackSessionState.Completed -> "✓ Tamamlandı"
    is PlaybackSessionState.Error -> "Hata"
    is PlaybackSessionState.PausedByUser ->
        "${state.active.range.startAyah}-${state.active.range.endAyah} " +
            "${state.active.currentRepeat}/${state.active.repeatTarget}"
    is PlaybackSessionState.Active ->
        "${state.range.startAyah}-${state.range.endAyah} ${state.currentRepeat}/${state.repeatTarget}"
}
