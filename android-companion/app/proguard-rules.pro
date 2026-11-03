# Health Connect & OkHttp rules
-keep class androidx.health.connect.client.** { *; }
-keepclassmembers class * {
    @androidx.health.connect.client.** *;
}

