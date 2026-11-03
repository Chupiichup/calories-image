package com.caloriesimage.companion

import android.content.Context
import com.caloriesimage.companion.model.DailyActivityPayload
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

    var lastSyncTimestamp: String?
        get() = prefs.getString("last_sync_timestamp", null)
        set(value) = prefs.edit().putString("last_sync_timestamp", value).apply()

    var lastSyncStatus: String?
        get() = prefs.getString("last_sync_status", null)
        set(value) = prefs.edit().putString("last_sync_status", value).apply()

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
            } else {
                val errMessage = "Lỗi máy chủ HTTP ${response.code}: $responseBody"
                lastSyncStatus = "Thất bại: $errMessage"
                Result.failure(Exception(errMessage))
            }
        } catch (e: Exception) {
            val errMessage = e.localizedMessage ?: "Lỗi kết nối mạng"
            lastSyncStatus = "Lỗi kết nối: $errMessage"
            Result.failure(e)
        }
    }
}

