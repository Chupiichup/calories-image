package com.caloriesimage.companion

import android.content.Context
import com.caloriesimage.companion.model.DailyActivityPayload
import com.caloriesimage.companion.model.LoginResponse
import com.caloriesimage.companion.model.PairResponse
import com.caloriesimage.companion.model.SyncResponse
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class SyncManager(context: Context) {

    private val prefs = context.getSharedPreferences("calories_image_sync", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    var serverUrl: String
        get() = prefs.getString("server_url", "https://calories-image.vercel.app") ?: "https://calories-image.vercel.app"
        set(value) = prefs.edit().putString("server_url", value.trim().removeSuffix("/")).apply()

    var authToken: String
        get() = prefs.getString("auth_token", "") ?: ""
        set(value) = prefs.edit().putString("auth_token", value.trim()).apply()

    var userEmail: String
        get() = prefs.getString("user_email", "") ?: ""
        set(value) = prefs.edit().putString("user_email", value.trim()).apply()

    val isPaired: Boolean
        get() = authToken.isNotBlank()

    var lastSyncTimestamp: String?
        get() = prefs.getString("last_sync_timestamp", null)
        set(value) = prefs.edit().putString("last_sync_timestamp", value).apply()

    var lastSyncStatus: String?
        get() = prefs.getString("last_sync_status", null)
        set(value) = prefs.edit().putString("last_sync_status", value).apply()

    fun disconnect() {
        authToken = ""
        userEmail = ""
        lastSyncStatus = "Đã ngắt kết nối tài khoản"
    }

    suspend fun pairWithCode(code: String): Result<PairResponse> = withContext(Dispatchers.IO) {
        try {
            val endpoint = "$serverUrl/api/activity/pair"
            val bodyMap = mapOf("action" to "verify", "code" to code.trim())
            val jsonBody = gson.toJson(bodyMap)
            val requestBody = jsonBody.toRequestBody("application/json; charset=utf-8".toMediaType())

            val request = Request.Builder()
                .url(endpoint)
                .post(requestBody)
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val pairResponse = gson.fromJson(responseBody, PairResponse::class.java)
                if (pairResponse.success && !pairResponse.token.isNullOrBlank()) {
                    authToken = pairResponse.token
                    userEmail = pairResponse.email ?: "Đã liên kết"
                    lastSyncStatus = "Đã liên kết tài khoản thành công"
                    Result.success(pairResponse)
                } else {
                    val err = pairResponse.error ?: "Mã kết nối không hợp lệ"
                    Result.failure(Exception(err))
                }
            } else {
                val errMessage = parseErrorMessage(responseBody, "Lỗi máy chủ HTTP ${response.code}")
                Result.failure(Exception(errMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun loginWithCredentials(email: String, pass: String): Result<LoginResponse> = withContext(Dispatchers.IO) {
        try {
            val endpoint = "$serverUrl/api/activity/login"
            val bodyMap = mapOf("email" to email.trim(), "password" to pass)
            val jsonBody = gson.toJson(bodyMap)
            val requestBody = jsonBody.toRequestBody("application/json; charset=utf-8".toMediaType())

            val request = Request.Builder()
                .url(endpoint)
                .post(requestBody)
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val loginResponse = gson.fromJson(responseBody, LoginResponse::class.java)
                if (loginResponse.success && !loginResponse.token.isNullOrBlank()) {
                    authToken = loginResponse.token
                    userEmail = loginResponse.user?.email ?: email.trim()
                    lastSyncStatus = "Đăng nhập thành công"
                    Result.success(loginResponse)
                } else {
                    val err = loginResponse.error ?: "Đăng nhập thất bại"
                    Result.failure(Exception(err))
                }
            } else {
                val errMessage = parseErrorMessage(responseBody, "Lỗi máy chủ HTTP ${response.code}")
                Result.failure(Exception(errMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncPayload(payload: DailyActivityPayload): Result<SyncResponse> = withContext(Dispatchers.IO) {
        try {
            val endpoint = "$serverUrl/api/activity/sync"
            val jsonBody = gson.toJson(payload)
            val requestBody = jsonBody.toRequestBody("application/json; charset=utf-8".toMediaType())

            val requestBuilder = Request.Builder()
                .url(endpoint)
                .post(requestBody)

            if (authToken.isNotBlank()) {
                requestBuilder.addHeader("Authorization", "Bearer $authToken")
            }

            val response = httpClient.newCall(requestBuilder.build()).execute()
            val responseBody = response.body?.string() ?: ""

            if (response.isSuccessful) {
                val syncResponse = gson.fromJson(responseBody, SyncResponse::class.java)
                lastSyncTimestamp = payload.syncedAt
                lastSyncStatus = "Thành công (${payload.steps} bước)"
                Result.success(syncResponse)
            } else if (response.code == 401) {
                val errMessage = "Chưa liên kết tài khoản hoặc phiên hết hạn. Vui lòng bấm 'Nhập mã kết nối (6 số)' hoặc 'Đăng nhập Email' để liên kết lại."
                lastSyncStatus = "Chưa xác thực (401)"
                Result.failure(Exception(errMessage))
            } else {
                val errMessage = parseErrorMessage(responseBody, "Lỗi máy chủ HTTP ${response.code}")
                lastSyncStatus = "Thất bại: $errMessage"
                Result.failure(Exception(errMessage))
            }
        } catch (e: Exception) {
            val errMessage = e.localizedMessage ?: "Lỗi kết nối mạng"
            lastSyncStatus = "Lỗi kết nối: $errMessage"
            Result.failure(e)
        }
    }

    private fun parseErrorMessage(json: String, fallback: String): String {
        return try {
            val map = gson.fromJson(json, Map::class.java)
            (map["error"] as? String) ?: fallback
        } catch (e: Exception) {
            fallback
        }
    }
}
