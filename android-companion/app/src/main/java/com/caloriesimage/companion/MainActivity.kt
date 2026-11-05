package com.caloriesimage.companion

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import com.caloriesimage.companion.model.DailyActivityPayload
import com.caloriesimage.companion.ui.MainScreen
import com.caloriesimage.companion.ui.theme.CaloriesCompanionTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var healthConnectManager: HealthConnectManager
    private lateinit var syncManager: SyncManager

    private var currentPayload by mutableStateOf<DailyActivityPayload?>(null)
    private var hasPermissions by mutableStateOf(false)
    private var isPaired by mutableStateOf(false)
    private var userEmail by mutableStateOf("")
    private var lastSyncStatus by mutableStateOf<String?>(null)
    private var lastSyncTime by mutableStateOf<String?>(null)

    // Health Connect Permission Request Launcher
    private val requestPermissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { grantedPermissions ->
        lifecycleScope.launch {
            hasPermissions = grantedPermissions.containsAll(healthConnectManager.requiredPermissions)
            if (hasPermissions) {
                Toast.makeText(this@MainActivity, "Đã cấp quyền Health Connect thành công!", Toast.LENGTH_SHORT).show()
                refreshActivityDataAndSync(autoSync = isPaired)
            } else {
                Toast.makeText(this@MainActivity, "Chưa cấp đủ quyền để đọc bước chân & calo.", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        healthConnectManager = HealthConnectManager(this)
        syncManager = SyncManager(this)

        isPaired = syncManager.isPaired
        userEmail = syncManager.userEmail
        lastSyncStatus = syncManager.lastSyncStatus
        lastSyncTime = syncManager.lastSyncTimestamp

        setContent {
            CaloriesCompanionTheme {
                MainScreen(
                    isHealthConnectAvailable = healthConnectManager.isHealthConnectAvailable(),
                    isSamsungHealthInstalled = healthConnectManager.isSamsungHealthInstalled(),
                    hasPermissions = hasPermissions,
                    isPaired = isPaired,
                    userEmail = userEmail,
                    currentPayload = currentPayload,
                    lastSyncStatus = lastSyncStatus,
                    lastSyncTime = lastSyncTime,
                    serverUrl = syncManager.serverUrl,
                    onRequestPermissions = {
                        requestPermissionLauncher.launch(healthConnectManager.requiredPermissions)
                    },
                    onSyncNow = {
                        refreshActivityDataAndSync(autoSync = true)
                    },
                    onPairWithCode = { code, onComplete ->
                        lifecycleScope.launch {
                            val result = syncManager.pairWithCode(code)
                            result.onSuccess {
                                isPaired = true
                                userEmail = syncManager.userEmail
                                Toast.makeText(this@MainActivity, "Đã liên kết tài khoản thành công!", Toast.LENGTH_SHORT).show()
                                onComplete(true, null)
                            }.onFailure { err ->
                                onComplete(false, err.message)
                            }
                        }
                    },
                    onLoginWithCredentials = { email, pass, onComplete ->
                        lifecycleScope.launch {
                            val result = syncManager.loginWithCredentials(email, pass)
                            result.onSuccess {
                                isPaired = true
                                userEmail = syncManager.userEmail
                                Toast.makeText(this@MainActivity, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show()
                                onComplete(true, null)
                            }.onFailure { err ->
                                onComplete(false, err.message)
                            }
                        }
                    },
                    onDisconnect = {
                        syncManager.disconnect()
                        isPaired = false
                        userEmail = ""
                        lastSyncStatus = "Đã ngắt kết nối tài khoản"
                        Toast.makeText(this@MainActivity, "Đã hủy liên kết tài khoản.", Toast.LENGTH_SHORT).show()
                    },
                    onSaveSettings = { url ->
                        syncManager.serverUrl = url
                        Toast.makeText(this@MainActivity, "Đã lưu cài đặt máy chủ.", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        lifecycleScope.launch {
            if (healthConnectManager.isHealthConnectAvailable()) {
                hasPermissions = healthConnectManager.hasAllPermissions()
                if (hasPermissions) {
                    refreshActivityDataAndSync(autoSync = false)
                }
            }
        }
    }

    private fun refreshActivityDataAndSync(autoSync: Boolean) {
        lifecycleScope.launch {
            try {
                val payload = healthConnectManager.readDailyActivity()
                currentPayload = payload

                if (autoSync) {
                    if (!syncManager.isPaired) {
                        lastSyncStatus = "Chưa liên kết tài khoản. Vui lòng bấm 'Nhập mã (6 số)' để liên kết trước."
                        return@launch
                    }

                    lastSyncStatus = "Đang đồng bộ lên máy chủ..."
                    val result = syncManager.syncPayload(payload)
                    result.onSuccess {
                        lastSyncStatus = "Đồng bộ thành công (${payload.steps} bước)"
                        lastSyncTime = payload.syncedAt
                        Toast.makeText(
                            this@MainActivity,
                            "Đã đồng bộ ${payload.steps} bước chân thành công!",
                            Toast.LENGTH_SHORT
                        ).show()
                    }.onFailure { err ->
                        lastSyncStatus = "Lỗi đồng bộ: ${err.message}"
                        Toast.makeText(
                            this@MainActivity,
                            "Lỗi: ${err.message}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            } catch (e: Exception) {
                lastSyncStatus = "Lỗi đọc dữ liệu: ${e.message}"
            }
        }
    }
}
