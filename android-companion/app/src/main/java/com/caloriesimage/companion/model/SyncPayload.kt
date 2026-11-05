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

data class PairResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("token")
    val token: String?,

    @SerializedName("userId")
    val userId: String?,

    @SerializedName("email")
    val email: String?,

    @SerializedName("error")
    val error: String?
)

data class LoginResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("token")
    val token: String?,

    @SerializedName("user")
    val user: UserInfo?,

    @SerializedName("error")
    val error: String?
)

data class UserInfo(
    @SerializedName("id")
    val id: String?,

    @SerializedName("email")
    val email: String?
)
