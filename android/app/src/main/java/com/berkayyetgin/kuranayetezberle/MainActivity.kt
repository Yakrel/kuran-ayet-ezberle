package com.berkayyetgin.kuranayetezberle

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.berkayyetgin.kuranayetezberle.ui.PracticeScreen
import com.berkayyetgin.kuranayetezberle.update.UpdateManager
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private var pendingPlaybackAction: (() -> Unit)? = null
    private lateinit var updateManager: UpdateManager

    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        val action = pendingPlaybackAction
        pendingPlaybackAction = null
        if (granted) action?.invoke()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        updateManager = UpdateManager(this).also { it.start() }
        setContent {
            PracticeScreen()
        }
    }

    fun runWithPlaybackPermission(action: () -> Unit) {
        val permissionRequired = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        if (!permissionRequired) {
            action()
            return
        }
        pendingPlaybackAction = action
        notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    override fun onResume() {
        super.onResume()
        if (::updateManager.isInitialized) updateManager.onResume()
    }

    override fun onDestroy() {
        pendingPlaybackAction = null
        if (::updateManager.isInitialized) updateManager.destroy()
        super.onDestroy()
    }
}
