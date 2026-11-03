package com.caloriesimage.companion.model

import com.google.gson.annotations.SerializedName

data class DailyActivityPayload(
    @SerializedName("activityDate")
    val activityDate: String,

    @SerializedName("steps")
    val steps: Long,

    @SerializedName("activeCaloriesKcal")
    val activeCaloriesKcal: Double?,

    @SerializedName("source")
    val source: String = "samsung_health",

    @SerializedName("timezone")
    val timezone: String,

    @SerializedName("syncedAt")
    val syncedAt: String
)

data class SyncResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("error")
    val error: String?,

    @SerializedName("mode")
    val mode: String?
)

