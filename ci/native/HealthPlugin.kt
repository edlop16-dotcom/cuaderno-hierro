package pe.edgwr.cuadernohierro

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/** Samsung Health → Health Connect: sueño, peso, pasos y pulso en reposo (solo lectura). */
@CapacitorPlugin(name = "Health")
class HealthPlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val provider = "com.google.android.apps.healthdata"

    private val perms: Set<String> by lazy {
        setOf(
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(WeightRecord::class),
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(RestingHeartRateRecord::class)
        )
    }

    private fun sdk(): Int =
        if (Build.VERSION.SDK_INT < 26) HealthConnectClient.SDK_UNAVAILABLE
        else try { HealthConnectClient.getSdkStatus(context, provider) } catch (e: Throwable) { HealthConnectClient.SDK_UNAVAILABLE }

    private fun client(): HealthConnectClient? =
        if (sdk() == HealthConnectClient.SDK_AVAILABLE) HealthConnectClient.getOrCreate(context, provider) else null

    private suspend fun statusObj(): JSObject {
        val r = JSObject()
        val s = sdk()
        r.put("available", when (s) {
            HealthConnectClient.SDK_AVAILABLE -> "yes"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update"
            else -> "no"
        })
        val c = client()
        val granted = if (c != null) try { c.permissionController.getGrantedPermissions() } catch (e: Throwable) { emptySet() } else emptySet()
        r.put("sleep", granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)))
        r.put("weight", granted.contains(HealthPermission.getReadPermission(WeightRecord::class)))
        r.put("steps", granted.contains(HealthPermission.getReadPermission(StepsRecord::class)))
        r.put("rhr", granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class)))
        r.put("any", granted.any { perms.contains(it) })
        return r
    }

    @PluginMethod
    fun status(call: PluginCall) {
        scope.launch { try { call.resolve(statusObj()) } catch (e: Throwable) { call.reject(e.message ?: "status") } }
    }

    @PluginMethod
    fun request(call: PluginCall) {
        if (sdk() != HealthConnectClient.SDK_AVAILABLE) { scope.launch { call.resolve(statusObj()) }; return }
        try {
            val intent = PermissionController.createRequestPermissionResultContract(provider).createIntent(context, perms)
            startActivityForResult(call, intent, "permResult")
        } catch (e: Throwable) { call.reject("No se pudo abrir Health Connect: " + e.message) }
    }

    @ActivityCallback
    fun permResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        scope.launch { try { call.resolve(statusObj()) } catch (e: Throwable) { call.reject(e.message ?: "perm") } }
    }

    @PluginMethod
    fun openStore(call: PluginCall) {
        val i = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$provider&url=healthconnect%3A%2F%2Fonboarding"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { context.startActivity(i) } catch (e: Throwable) {
            try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$provider")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (ignored: Throwable) {}
        }
        call.resolve()
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        val action = if (Build.VERSION.SDK_INT >= 34) "android.health.connect.action.HEALTH_HOME_SETTINGS" else "androidx.health.ACTION_HEALTH_CONNECT_SETTINGS"
        try { context.startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Throwable) {}
        call.resolve()
    }

    @PluginMethod
    fun read(call: PluginCall) {
        val days = (call.getInt("days") ?: 14).coerceIn(1, 60)
        val c = client()
        if (c == null) { call.reject("Health Connect no disponible"); return }
        scope.launch {
            val zone = ZoneId.systemDefault()
            val end = Instant.now()
            val start = LocalDate.now(zone).minusDays(days.toLong()).atStartOfDay(zone).toInstant()
            val range = TimeRangeFilter.between(start, end)
            val out = JSObject()
            val day = { t: Instant -> t.atZone(zone).toLocalDate().toString() }

            val sleep = JSArray()
            try {
                c.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range)).records.forEach { s ->
                    val o = JSObject()
                    o.put("day", day(s.endTime))
                    o.put("start", s.startTime.toEpochMilli())
                    o.put("end", s.endTime.toEpochMilli())
                    o.put("min", ChronoUnit.MINUTES.between(s.startTime, s.endTime))
                    sleep.put(o)
                }
            } catch (e: Throwable) {}
            out.put("sleep", sleep)

            val weight = JSArray()
            try {
                c.readRecords(ReadRecordsRequest(WeightRecord::class, range)).records.forEach { w ->
                    val o = JSObject()
                    o.put("day", day(w.time))
                    o.put("at", w.time.toEpochMilli())
                    o.put("kg", w.weight.inKilograms)
                    weight.put(o)
                }
            } catch (e: Throwable) {}
            out.put("weight", weight)

            val rhr = JSArray()
            try {
                c.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records.forEach { h ->
                    val o = JSObject()
                    o.put("day", day(h.time))
                    o.put("bpm", h.beatsPerMinute)
                    rhr.put(o)
                }
            } catch (e: Throwable) {}
            out.put("rhr", rhr)

            val steps = JSArray()
            try {
                val from = LocalDate.now(zone).minusDays(days.toLong()).atStartOfDay()
                val to = LocalDateTime.now(zone)
                c.aggregateGroupByPeriod(
                    AggregateGroupByPeriodRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(from, to), Period.ofDays(1))
                ).forEach { g ->
                    val n = g.result[StepsRecord.COUNT_TOTAL]
                    if (n != null) {
                        val o = JSObject()
                        o.put("day", g.startTime.toLocalDate().toString())
                        o.put("n", n)
                        steps.put(o)
                    }
                }
            } catch (e: Throwable) {}
            out.put("steps", steps)

            call.resolve(out)
        }
    }
}
