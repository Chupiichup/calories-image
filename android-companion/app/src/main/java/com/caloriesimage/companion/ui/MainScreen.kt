package com.caloriesimage.companion.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
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
    isPaired: Boolean,
    userEmail: String,
    currentPayload: DailyActivityPayload?,
    lastSyncStatus: String?,
    lastSyncTime: String?,
    serverUrl: String,
    onRequestPermissions: () -> Unit,
    onSyncNow: () -> Unit,
    onPairWithCode: (code: String, onComplete: (Boolean, String?) -> Unit) -> Unit,
    onLoginWithCredentials: (email: String, pass: String, onComplete: (Boolean, String?) -> Unit) -> Unit,
    onDisconnect: () -> Unit,
    onSaveSettings: (url: String) -> Unit
) {
    val isDark = isSystemInDarkTheme()

    var showPairDialog by remember { mutableStateOf(false) }
    var showLoginDialog by remember { mutableStateOf(false) }
    var showSettingsDialog by remember { mutableStateOf(false) }

    var pairCodeInput by remember { mutableStateOf("") }
    var pairLoading by remember { mutableStateOf(false) }
    var pairError by remember { mutableStateOf<String?>(null) }

    var loginEmailInput by remember { mutableStateOf("") }
    var loginPasswordInput by remember { mutableStateOf("") }
    var loginLoading by remember { mutableStateOf(false) }
    var loginError by remember { mutableStateOf<String?>(null) }

    var inputUrl by remember { mutableStateOf(serverUrl) }

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
                        showSettingsDialog = true
                    }) {
                        Icon(Icons.Default.Settings, contentDescription = "Cài đặt")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    actionIconContentColor = MaterialTheme.colorScheme.onSurface
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
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Card 1: System & Permissions Status
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface
                ),
                border = BorderStroke(1.dp, if (isDark) Color(0xFF2A2A2A) else Color(0xFFE5E7EB)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Trạng thái hệ thống",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Samsung Health:",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 13.sp
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Android Health Connect:",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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
                                color = Color(0xFFDC2626),
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
                        Text(
                            text = "Quyền đọc dữ liệu:",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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

            // Card 2: Account Connection Status & Pairing
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isPaired) {
                        if (isDark) Color(0xFF064E3B).copy(alpha = 0.3f) else Color(0xFFECFDF5)
                    } else {
                        if (isDark) Color(0xFF78350F).copy(alpha = 0.25f) else Color(0xFFFFFBEB)
                    },
                    contentColor = MaterialTheme.colorScheme.onSurface
                ),
                border = BorderStroke(
                    1.dp,
                    if (isPaired) EmeraldPrimary.copy(alpha = 0.5f) else Color(0xFFF59E0B).copy(alpha = 0.5f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (isPaired) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = EmeraldPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Column {
                                    Text(
                                        text = "Đã liên kết tài khoản",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = userEmail.ifBlank { "Tài khoản Calories Image" },
                                        fontSize = 12.sp,
                                        color = EmeraldPrimary,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }

                            TextButton(
                                onClick = onDisconnect,
                                colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFDC2626))
                            ) {
                                Text("Hủy", fontSize = 12.sp)
                            }
                        }
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = Color(0xFFD97706),
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Chưa liên kết tài khoản Web",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Text(
                            text = "Liên kết để đẩy bước chân & calo hoạt động trực tiếp lên bảng theo dõi web của bạn:",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    pairError = null
                                    pairCodeInput = ""
                                    showPairDialog = true
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                            ) {
                                Icon(Icons.Default.VpnKey, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(text = "Nhập mã (6 số)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = {
                                    loginError = null
                                    showLoginDialog = true
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(text = "Đăng nhập", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Card 3: Today's Activity Metrics
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isDark) Color(0xFF1E2923) else EmeraldLight.copy(alpha = 0.5f),
                    contentColor = MaterialTheme.colorScheme.onSurface
                ),
                border = BorderStroke(1.dp, EmeraldPrimary.copy(alpha = 0.3f)),
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
                            fontSize = 14.sp,
                            color = EmeraldPrimary
                        )
                        Icon(Icons.Default.DirectionsWalk, contentDescription = null, tint = EmeraldPrimary)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Bước chân",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "${currentPayload?.steps ?: 0}",
                                fontSize = 30.sp,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Calo vận động",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = if (currentPayload?.activeCaloriesKcal != null) {
                                    "${Math.round(currentPayload.activeCaloriesKcal)} kcal"
                                } else {
                                    "Chưa có"
                                },
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isDark) Color(0xFFFBBF24) else Color(0xFFB45309)
                            )
                        }
                    }
                }
            }

            // Card 4: Sync Button
            Button(
                onClick = {
                    if (!isPaired) {
                        showPairDialog = true
                    } else {
                        onSyncNow()
                    }
                },
                enabled = hasPermissions,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
            ) {
                Icon(Icons.Default.Sync, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isPaired) "Đồng bộ lên Web ngay" else "Liên kết & Đồng bộ lên Web",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Card 5: Sync Status Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface
                ),
                border = BorderStroke(1.dp, if (isDark) Color(0xFF2A2A2A) else Color(0xFFE5E7EB)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Trạng thái đồng bộ:",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = lastSyncStatus ?: "Chưa đồng bộ lần nào",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (!lastSyncTime.isNullOrBlank()) {
                        Text(
                            text = "Lần cuối: $lastSyncTime",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Bottom informational note
            Text(
                text = "Ứng dụng sẽ tự động tải các chỉ số bước chân và calo hoạt động từ Samsung Health thông qua Android Health Connect và gửi lên hệ thống Calories Image.",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 16.sp,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }
    }

    // 1. 6-Digit Pairing Dialog
    if (showPairDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!pairLoading) showPairDialog = false
            },
            title = {
                Text(
                    text = "Nhập mã kết nối từ Web",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Mở website Calories Image trên máy tính/trình duyệt, bấm nút 'Kết nối App' ở góc thẻ Hoạt động để lấy mã kết nối 6 chữ số:",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    OutlinedTextField(
                        value = pairCodeInput,
                        onValueChange = {
                            if (it.length <= 6 && it.all { ch -> ch.isDigit() }) {
                                pairCodeInput = it
                            }
                        },
                        label = { Text("Mã kết nối (6 số)") },
                        placeholder = { Text("Ví dụ: 849201") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (!pairError.isNullOrBlank()) {
                        Text(
                            text = pairError!!,
                            color = Color(0xFFDC2626),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        pairLoading = true
                        pairError = null
                        onPairWithCode(pairCodeInput) { success, err ->
                            pairLoading = false
                            if (success) {
                                showPairDialog = false
                                onSyncNow()
                            } else {
                                pairError = err ?: "Mã kết nối không hợp lệ hoặc đã hết hạn"
                            }
                        }
                    },
                    enabled = pairCodeInput.length == 6 && !pairLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                ) {
                    if (pairLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Xác nhận liên kết")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showPairDialog = false },
                    enabled = !pairLoading
                ) {
                    Text("Hủy")
                }
            }
        )
    }

    // 2. Email Login Dialog
    if (showLoginDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!loginLoading) showLoginDialog = false
            },
            title = {
                Text(
                    text = "Đăng nhập tài khoản Web",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Đăng nhập bằng tài khoản email & mật khẩu đã đăng ký trên Calories Image:",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    OutlinedTextField(
                        value = loginEmailInput,
                        onValueChange = { loginEmailInput = it },
                        label = { Text("Email") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = loginPasswordInput,
                        onValueChange = { loginPasswordInput = it },
                        label = { Text("Mật khẩu") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (!loginError.isNullOrBlank()) {
                        Text(
                            text = loginError!!,
                            color = Color(0xFFDC2626),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        loginLoading = true
                        loginError = null
                        onLoginWithCredentials(loginEmailInput, loginPasswordInput) { success, err ->
                            loginLoading = false
                            if (success) {
                                showLoginDialog = false
                                onSyncNow()
                            } else {
                                loginError = err ?: "Đăng nhập thất bại"
                            }
                        }
                    },
                    enabled = loginEmailInput.isNotBlank() && loginPasswordInput.isNotBlank() && !loginLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                ) {
                    if (loginLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Đăng nhập")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showLoginDialog = false },
                    enabled = !loginLoading
                ) {
                    Text("Hủy")
                }
            }
        )
    }

    // 3. Settings Dialog (Server URL)
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
                    Text(
                        text = "Mặc định: https://calories-image.vercel.app",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onSaveSettings(inputUrl)
                        showSettingsDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                ) {
                    Text("Lưu")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettingsDialog = false }) {
                    Text("Đóng")
                }
            }
        )
    }
}
