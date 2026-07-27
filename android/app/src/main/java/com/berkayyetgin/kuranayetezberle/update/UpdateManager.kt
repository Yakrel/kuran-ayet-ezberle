package com.berkayyetgin.kuranayetezberle.update

import android.app.Activity
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.berkayyetgin.kuranayetezberle.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Locale
import kotlin.concurrent.thread
import org.json.JSONObject

class UpdateManager(private val activity: Activity) {
    private val downloadManager = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    private val preferences = activity.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    private var checkStarted = false
    private var receiverRegistered = false
    private var waitingForInstallPermission = false

    private val downloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
            val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            if (completedId == preferences.getLong(KEY_DOWNLOAD_ID, -2L)) verifyAndInstall(completedId)
        }
    }

    fun start() {
        registerReceiver()
        resumePendingDownload()
        if (checkStarted) return
        checkStarted = true
        thread(name = "app-update-check") { checkForUpdate() }
    }

    fun onResume() {
        if (!waitingForInstallPermission) return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || activity.packageManager.canRequestPackageInstalls()) {
            waitingForInstallPermission = false
            installDownloadedApk(preferences.getLong(KEY_DOWNLOAD_ID, -1L))
        }
    }

    fun destroy() {
        if (!receiverRegistered) return
        runCatching { activity.unregisterReceiver(downloadReceiver) }
        receiverRegistered = false
    }

    private fun registerReceiver() {
        if (receiverRegistered) return
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        ContextCompat.registerReceiver(
            activity,
            downloadReceiver,
            filter,
            ContextCompat.RECEIVER_EXPORTED,
        )
        receiverRegistered = true
    }

    private fun checkForUpdate() {
        val release = runCatching { loadLatestRelease() }.getOrNull() ?: return
        if (compareVersions(release.version, BuildConfig.VERSION_NAME) <= 0) return

        activity.runOnUiThread {
            if (activity.isFinishing || activity.isDestroyed) return@runOnUiThread
            AlertDialog.Builder(activity)
                .setTitle("Güncelleme hazır")
                .setMessage("${release.version} sürümü hazır. Şimdi indirip yüklemek ister misin?")
                .setNegativeButton("Daha sonra", null)
                .setPositiveButton("İndir") { _, _ -> prepareDownload(release) }
                .show()
        }
    }

    private fun loadLatestRelease(): Release {
        val response = JSONObject(readUrl("$UPDATE_MANIFEST_URL?t=${System.currentTimeMillis()}"))
        val apkUrl = response.getString("apkUrl")
        check(Uri.parse(apkUrl).scheme.equals("https", ignoreCase = true)) { "Güvensiz APK adresi." }
        return Release(
            version = response.getString("version").removePrefix("v"),
            apkUrl = apkUrl,
            expectedHash = response.getString("sha256").lowercase(Locale.US),
        )
    }

    private fun prepareDownload(release: Release) {
        if (!release.expectedHash.matches(Regex("[a-f0-9]{64}"))) {
            showUpdateError("Güncelleme doğrulama bilgisi geçersiz.")
            return
        }
        runCatching { enqueueDownload(release) }
            .onFailure { showUpdateError("Güncelleme indirilemedi.") }
    }

    private fun enqueueDownload(release: Release) {
        val fileName = "kuran-ayet-ezberle-${release.version}.apk"
        activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)?.resolve(fileName)?.delete()
        val previousDownloadId = preferences.getLong(KEY_DOWNLOAD_ID, -1L)
        if (previousDownloadId >= 0L) downloadManager.remove(previousDownloadId)

        val request = DownloadManager.Request(Uri.parse(release.apkUrl))
            .setTitle("Kur'an Ayet Ezberle ${release.version}")
            .setDescription("Uygulama güncellemesi indiriliyor")
            .setMimeType(APK_MIME_TYPE)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, fileName)

        val downloadId = downloadManager.enqueue(request)
        preferences.edit()
            .putLong(KEY_DOWNLOAD_ID, downloadId)
            .putString(KEY_EXPECTED_HASH, release.expectedHash)
            .apply()
        Toast.makeText(activity, "Güncelleme indiriliyor", Toast.LENGTH_SHORT).show()
    }

    private fun resumePendingDownload() {
        val downloadId = preferences.getLong(KEY_DOWNLOAD_ID, -1L)
        if (downloadId < 0L) return
        when (queryDownloadStatus(downloadId)) {
            DownloadManager.STATUS_SUCCESSFUL -> verifyAndInstall(downloadId)
            DownloadManager.STATUS_FAILED -> clearPendingDownload()
        }
    }

    private fun verifyAndInstall(downloadId: Long) {
        val expectedHash = preferences.getString(KEY_EXPECTED_HASH, null) ?: return clearPendingDownload()
        thread(name = "app-update-verify") {
            val uri = downloadManager.getUriForDownloadedFile(downloadId)
            val actualHash = uri?.let(::sha256)
            if (actualHash == null || !actualHash.equals(expectedHash, ignoreCase = true)) {
                downloadManager.remove(downloadId)
                clearPendingDownload()
                showUpdateError("İndirilen güncelleme doğrulanamadı ve silindi.")
                return@thread
            }
            activity.runOnUiThread { requestInstall(downloadId) }
        }
    }

    private fun requestInstall(downloadId: Long) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.packageManager.canRequestPackageInstalls()) {
            waitingForInstallPermission = true
            val intent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${activity.packageName}"),
            )
            runCatching { activity.startActivity(intent) }
                .onFailure {
                    waitingForInstallPermission = false
                    showUpdateError("Yükleme izni ekranı açılamadı.")
                }
            return
        }
        installDownloadedApk(downloadId)
    }

    private fun installDownloadedApk(downloadId: Long) {
        if (downloadId < 0L) return
        val uri = downloadManager.getUriForDownloadedFile(downloadId) ?: return clearPendingDownload()
        val intent = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, APK_MIME_TYPE)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        runCatching { activity.startActivity(intent) }
            .onSuccess { clearPendingDownload() }
            .onFailure { showUpdateError("Android yükleyicisi açılamadı.") }
    }

    private fun queryDownloadStatus(downloadId: Long): Int? =
        downloadManager.query(DownloadManager.Query().setFilterById(downloadId))?.use { cursor ->
            if (!cursor.moveToFirst()) return@use null
            cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
        }

    private fun sha256(uri: Uri): String? {
        val digest = MessageDigest.getInstance("SHA-256")
        val input = activity.contentResolver.openInputStream(uri) ?: return null
        input.use { stream ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val count = stream.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { byte -> "%02x".format(byte) }
    }

    private fun readUrl(url: String): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = NETWORK_TIMEOUT_MS
            connection.readTimeout = NETWORK_TIMEOUT_MS
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("User-Agent", "kuran-ayet-ezberle-android")
            if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}")
            connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    private fun showUpdateError(message: String) {
        activity.runOnUiThread {
            if (!activity.isFinishing && !activity.isDestroyed) {
                Toast.makeText(activity, message, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun clearPendingDownload() {
        preferences.edit().remove(KEY_DOWNLOAD_ID).remove(KEY_EXPECTED_HASH).apply()
    }

    private fun compareVersions(left: String, right: String): Int {
        val leftParts = versionParts(left)
        val rightParts = versionParts(right)
        for (index in 0..2) {
            val comparison = leftParts[index].compareTo(rightParts[index])
            if (comparison != 0) return comparison
        }
        return 0
    }

    private fun versionParts(value: String): List<Int> = value.removePrefix("v")
        .substringBefore('-')
        .split('.')
        .take(3)
        .map { it.toIntOrNull() ?: 0 }
        .let { it + List(3 - it.size) { 0 } }

    private data class Release(
        val version: String,
        val apkUrl: String,
        val expectedHash: String,
    )

    private companion object {
        const val UPDATE_MANIFEST_URL =
            "https://github.com/Yakrel/kuran-ayet-ezberle/releases/download/app-update/update.json"
        const val APK_MIME_TYPE = "application/vnd.android.package-archive"
        const val NETWORK_TIMEOUT_MS = 8_000
        const val PREFERENCES_NAME = "app_update_manager"
        const val KEY_DOWNLOAD_ID = "download_id"
        const val KEY_EXPECTED_HASH = "expected_hash"
    }
}
