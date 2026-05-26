package com.berkayyetgin.kuranayetezberle.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@Composable
internal fun DownloadProgressStrip(downloadState: DownloadState) {
    val progress = downloadState as? DownloadState.InProgress ?: return
    val fraction = progress.fraction

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = progress.label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = progress.percentLabel ?: "",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                textAlign = TextAlign.End,
                modifier = Modifier
                    .padding(start = 8.dp)
                    .width(38.dp),
            )
        }
        if (fraction != null) {
            androidx.compose.material3.LinearProgressIndicator(
                progress = { fraction },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
        } else {
            androidx.compose.material3.LinearProgressIndicator(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun DownloadManagerCard(
    state: PracticeUiState,
    onDownloadSelected: () -> Unit,
    onDownloadAll: () -> Unit,
    onClearCache: () -> Unit,
) {
    val isDownloading = state.downloadState is DownloadState.InProgress
    val totalSurahs = state.surahs.size
    val cacheFraction = if (totalSurahs > 0) {
        state.cachedSurahCount.toFloat() / totalSurahs.toFloat()
    } else {
        0f
    }
    val selectedStatus = when {
        isDownloading -> "İndiriliyor"
        state.isSelectedSurahCached -> "Cihazda hazır"
        else -> "İndirilecek"
    }
    val allCached = totalSurahs > 0 && state.cachedSurahCount >= totalSurahs

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Text(
                        text = "Seçili sure",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = state.selectedSurah?.name ?: "Sure",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (state.isSelectedSurahCached) {
                        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.75f)
                    } else {
                        MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.55f)
                    },
                ) {
                    Text(
                        text = selectedStatus,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (state.isSelectedSurahCached) {
                            MaterialTheme.colorScheme.onPrimaryContainer
                        } else {
                            MaterialTheme.colorScheme.onSecondaryContainer
                        },
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                        maxLines = 1,
                    )
                }
            }

            if (totalSurahs > 0) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "İndirilen sure",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "${state.cachedSurahCount}/$totalSurahs",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                androidx.compose.material3.LinearProgressIndicator(
                    progress = { cacheFraction.coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                )
            }

            DownloadProgressStrip(state.downloadState)

            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                TextButton(
                    onClick = onDownloadSelected,
                    enabled = !isDownloading && !state.isSelectedSurahCached && state.selectedSurah != null,
                ) {
                    Text(
                        text = if (state.isSelectedSurahCached) "Seçili sure hazır" else "Seçili sureyi indir",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                TextButton(
                    onClick = onDownloadAll,
                    enabled = !isDownloading && totalSurahs > 0 && !allCached,
                ) {
                    Text(if (allCached) "Tümü hazır" else "Tüm sureleri indir")
                }
                TextButton(
                    onClick = onClearCache,
                    enabled = !isDownloading && state.cachedSurahCount > 0,
                ) {
                    Text(
                        "Önbelleği temizle",
                        color = if (!isDownloading && state.cachedSurahCount > 0) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                }
            }
        }
    }
}
