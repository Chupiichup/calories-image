package com.caloriesimage.companion

import android.content.Context
import android.content.pm.PackageManager
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.caloriesimage.companion.model.DailyActivityPayload
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class HealthConnectManager(private val context: Context) {

    val healthConnectClient by lazy {
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }
    }

    val requiredPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)
    )

    fun isHealthConnectAvailable(): Boolean {
        return HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    }

    fun isSamsungHealthInstalled(): Boolean {
        return try {
            context.packageManager.getPackageInfo("com.sec.android.app.shealth", 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }

    suspend fun hasAllPermissions(): Boolean {
        val client = healthConnectClient ?: return false
        val granted = client.permissionController.getGrantedPermissions()
        return granted.containsAll(requiredPermissions)
    }

    /**
     * Reads aggregated steps and active calories from local midnight to the next local midnight
     * for the given calendar date in the device's local timezone.
     */
    suspend fun readDailyActivity(date: LocalDate = LocalDate.now()): DailyActivityPayload {
        val client = healthConnectClient
            ?: throw IllegalStateException("Health Connect is not available on this device.")

        val zoneId = ZoneId.systemDefault()
        val startOfDay = date.atStartOfDay(zoneId).toInstant()
        val endOfDay = date.plusDays(1).atStartOfDay(zoneId).toInstant()

        val timeRange = TimeRangeFilter.between(startOfDay, endOfDay)

        val aggregateResponse = client.aggregate(
            AggregateRequest(
                metrics = setOf(
                    StepsRecord.COUNT_TOTAL,
                    ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
                ),
                timeRangeFilter = timeRange
            )
        )

        // Steps COUNT_TOTAL aggregate automatically deduplicates records from overlapping sources
        val totalSteps = aggregateResponse[StepsRecord.COUNT_TOTAL] ?: 0L

        // ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL in kcal
        val energyBurned = aggregateResponse[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]
        val activeCaloriesKcal = energyBurned?.inKilocalories

        val isSamsung = isSamsungHealthInstalled()

        return DailyActivityPayload(
            activityDate = date.format(DateTimeFormatter.ISO_LOCAL_DATE),
            steps = totalSteps,
            activeCaloriesKcal = activeCaloriesKcal,
            source = if (isSamsung) "samsung_health" else "health_connect",
            timezone = zoneId.id,
            syncedAt = Instant.now().toString()
        )
    }
}

