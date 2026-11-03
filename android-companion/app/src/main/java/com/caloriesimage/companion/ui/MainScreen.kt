package com.caloriesimage.companion.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.caloriesimage.companion.model.DailyActivityPayload
import com.caloriesimage.companion.ui.theme.EmeraldLight
import com.caloriesimage.companion.ui.theme.EmeraldPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    isHealthConnectAvailable: Boolean,
    isSamsungHealthInstalled: Boolean,
    hasPermissions: Boolean,
    currentPayload: DailyActivityPayload?,
    lastSyncStatus: String?,
    lastSyncTime: String?,
    serverUrl: String,
    authToken: String,
    onRequestPermissions: () -> Unit,
    onSyncNow: () -> Unit,
    onSaveSettings: (url: String, token: String) -> Unit
) {
    var showSettingsDialog by remember { mutableStateOf(false) }
    var inputUrl by remember { mutableStateOf(serverUrl) }
    var inputToken by remember { mutableStateOf(authToken) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Calories Image Companion",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                actions = {
                    IconButton(onClick = {
                        inputUrl = serverUrl
                        inputToken = authToken
                        showSettingsDialog = true
                    }) {
                        Icon(Icons.Default.Settings, contentDescription = "Cài đặt")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Samsung Health & Health Connect Status
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Trạng thái hệ thống",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "Samsung Health:", fontSize = 13.sp)
                        if (isSamsungHealthInstalled) {
                            Text(
                                text = "Đã cài đặt ✓",
                                color = EmeraldPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        } else {
                            Text(
                                text = "Chưa phát hiện",
                                color = Color.Gray,
                                fontSize = 13.sp
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "Android Health Connect:", fontSize = 13.sp)
                        if (isHealthConnectAvailable) {
                            Text(
                                text = "Khả dụng ✓",
                                color = EmeraldPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        } else {
                            Text(
                                text = "Không khả dụng ⚠",
                                color = Color.Red,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "Quyền đọc dữ liệu:", fontSize = 13.sp)
                        if (hasPermissions) {
                            Text(
                                text = "Đã cấp đầy đủ ✓",
                                color = EmeraldPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        } else {
                            Text(
                                text = "Chưa cấp quyền ⚠",
                                color = Color(0xFFD97706),
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }

                    if (!hasPermissions && isHealthConnectAvailable) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Button(
                            onClick = onRequestPermissions,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                        ) {
                            Icon(Icons.Default.Security, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "Cấp quyền Health Connect", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Today's Activity Metrics
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = EmeraldLight.copy(alpha = 0.4f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Hôm nay (${currentPayload?.activityDate ?: "Đang tải..."})",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = EmeraldPrimary
                        )
                        Icon(Icons.Default.DirectionsWalk, contentDescription = null, tint = EmeraldPrimary)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(text = "Bước chân", fontSize = 12.sp, color = Color.Gray)
                            Text(
                                text = "${currentPayload?.steps ?: 0}",
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF1C1917)
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(text = "Calo vận động", fontSize = 12.sp, color = Color.Gray)
                            Text(
                                text = if (currentPayload?.activeCaloriesKcal != null) {
                                    "${Math.round(currentPayload.activeCaloriesKcal)} kcal"
                                } else {
                                    "Chưa có"
                                },
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFB45309)
                            )
                        }
                    }
                }
            }

            // Sync Button & Last Status
            Button(
                onClick = onSyncNow,
                enabled = hasPermissions,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
            ) {
                Icon(Icons.Default.Sync, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = "Đồng bộ lên Web ngay", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }

            // Status Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Trạng thái đồng bộ:",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = lastSyncStatus ?: "Chưa đồng bộ lần nào",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                    if (!lastSyncTime.isNullOrBlank()) {
                        Text(
                            text = "Lần cuối: $lastSyncTime",
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                }
            }

            // Information note
            Text(
                text = "Ứng dụng sẽ tự động tải các chỉ số bước chân và calo hoạt động từ Samsung Health thông qua Android Health Connect và đẩy lên hệ thống Calories Image.",
                fontSize = 11.sp,
                color = Color.Gray,
                lineHeight = 16.sp,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }
    }

    // Settings Dialog
    if (showSettingsDialog) {
        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = { Text(text = "Cấu hình Máy chủ") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = inputUrl,
                        onValueChange = { inputUrl = it },
                        label = { Text("Địa chỉ Vercel Web App") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = inputToken,
                        onValueChange = { inputToken = it },
                        label = { Text("Supabase Auth Token (Tùy chọn)") },
                        singleLine = false,
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    onSaveSettings(inputUrl, inputToken)
                    showSettingsDialog = false
                }) {
                    Text("Lưu")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettingsDialog = false }) {
                    Text("Hủy")
                }
            }
        )
    }
}

