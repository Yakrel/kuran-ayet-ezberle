package com.berkayyetgin.kuranayetezberle.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.berkayyetgin.kuranayetezberle.data.AyahWithDetails
import com.berkayyetgin.kuranayetezberle.domain.PlaybackSessionState
import com.berkayyetgin.kuranayetezberle.ui.theme.AppTheme

@Composable
fun PracticeScreen(viewModel: PracticeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    AppTheme(darkTheme = state.settings.darkTheme) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            CompactSelectionBar(state, viewModel)
            PlaybackBar(state, viewModel)
            state.error?.let { ErrorStrip(it) }
            AyahList(
                ayahs = state.visibleAyahs,
                activeAyah = state.activeAyah,
                showTranscription = state.settings.showTranscription,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CompactSelectionBar(state: PracticeUiState, viewModel: PracticeViewModel) {
    var expanded by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded },
            modifier = Modifier.weight(1f),
        ) {
            OutlinedTextField(
                value = state.selectedSurah?.let { "${it.id}. ${it.name}" }.orEmpty(),
                onValueChange = {},
                readOnly = true,
                label = { Text("Sure") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier
                    .menuAnchor()
                    .fillMaxWidth(),
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                state.surahs.forEach { surah ->
                    DropdownMenuItem(
                        text = { Text("${surah.id}. ${surah.name}") },
                        onClick = {
                            expanded = false
                            viewModel.selectSurah(surah.id)
                        },
                    )
                }
            }
        }
        NumberField("Baş", state.startAyah, Modifier.width(76.dp)) { viewModel.setStartAyah(it) }
        NumberField("Son", state.endAyah, Modifier.width(76.dp)) { viewModel.setEndAyah(it) }
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        NumberField("Tekrar", state.settings.repeatCount, Modifier.width(96.dp)) { viewModel.setRepeatCount(it) }
        NumberField("Sayfa", state.selectedPage, Modifier.width(92.dp)) { viewModel.setPage(it) }
        Text(
            text = "${state.startAyah}-${state.endAyah} x ${state.settings.repeatCount}",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.End,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PlaybackBar(state: PracticeUiState, viewModel: PracticeViewModel) {
    val session = state.sessionState
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(onClick = viewModel::start) { Text("Start") }
            OutlinedButton(
                onClick = viewModel::pauseOrResume,
                enabled = session is PlaybackSessionState.Active || session is PlaybackSessionState.PausedByUser,
            ) {
                Text(if (session is PlaybackSessionState.PausedByUser) "Resume" else "Pause")
            }
            TextButton(onClick = viewModel::stop) { Text("Stop") }
            Text(
                text = sessionLabel(session),
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.End,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            itemVerticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Hız ${"%.1f".format(state.settings.playbackSpeed)}x")
            Slider(
                value = state.settings.playbackSpeed,
                onValueChange = viewModel::setSpeed,
                valueRange = 0.5f..2f,
                steps = 5,
                modifier = Modifier.width(140.dp),
            )
            FilterChip(
                selected = state.settings.showTranscription,
                onClick = viewModel::toggleTranscription,
                label = { Text("Okunuş") },
            )
            FilterChip(
                selected = state.settings.translationAuthorId == "6",
                onClick = { viewModel.setTranslationAuthor(if (state.settings.translationAuthorId == "6") "32" else "6") },
                label = { Text(if (state.settings.translationAuthorId == "6") "TR" else "EN") },
            )
            FilterChip(
                selected = state.settings.darkTheme,
                onClick = viewModel::toggleDarkTheme,
                label = { Text("Koyu") },
            )
            TextButton(onClick = viewModel::downloadSelectedSurah) { Text("İndir") }
            TextButton(onClick = viewModel::downloadAllSurahs) { Text("Tümü") }
            TextButton(onClick = viewModel::clearCache) { Text("Temizle") }
        }
    }
}

@Composable
private fun NumberField(label: String, value: Int, modifier: Modifier = Modifier, onChange: (Int) -> Unit) {
    OutlinedTextField(
        value = value.toString(),
        onValueChange = { text -> text.toIntOrNull()?.let(onChange) },
        label = { Text(label) },
        singleLine = true,
        modifier = modifier,
    )
}

@Composable
private fun AyahList(
    ayahs: List<AyahWithDetails>,
    activeAyah: Int?,
    showTranscription: Boolean,
    modifier: Modifier = Modifier,
) {
    LazyColumn(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(ayahs, key = { "${it.surahId}:${it.number}" }) { ayah ->
            AyahCard(ayah, active = ayah.number == activeAyah, showTranscription = showTranscription)
        }
    }
}

@Composable
private fun AyahCard(ayah: AyahWithDetails, active: Boolean, showTranscription: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
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
        Text(
            text = ayah.arabic,
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.End,
            modifier = Modifier.fillMaxWidth(),
            fontWeight = FontWeight.Medium,
        )
        if (showTranscription && ayah.transcription.isNotBlank()) {
            Text(text = ayah.transcription, style = MaterialTheme.typography.bodyMedium)
        }
        Text(text = ayah.translation, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun ErrorStrip(message: String) {
    Text(
        text = message,
        color = MaterialTheme.colorScheme.onErrorContainer,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(8.dp))
            .padding(10.dp),
    )
}

private fun sessionLabel(state: PlaybackSessionState): String = when (state) {
    PlaybackSessionState.Idle -> "Hazır"
    PlaybackSessionState.Stopped -> "Durduruldu"
    PlaybackSessionState.Completed -> "Tamamlandı"
    is PlaybackSessionState.Error -> "Hata"
    is PlaybackSessionState.PausedByUser -> "Duraklatıldı"
    is PlaybackSessionState.Active -> "${state.range.startAyah}-${state.range.endAyah} ${state.currentRepeat}/${state.repeatTarget}"
}
