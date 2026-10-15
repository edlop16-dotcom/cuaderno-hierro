package pe.edgwr.cuadernohierro;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "HabitAlarm")
public class HabitAlarmPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        Context c = getContext();
        JSArray items = call.getArray("items");
        HabitAlarms.cancelAll(c);
        JSONArray keep = new JSONArray();
        try {
            if (items != null) for (int k = 0; k < items.length(); k++) {
                JSONObject o = items.getJSONObject(k);
                keep.put(o);
                HabitAlarms.arm(c, o);
            }
        } catch (Exception e) { call.reject("schedule: " + e.getMessage()); return; }
        HabitAlarms.save(c, keep);
        HabitAlarms.channel(c);
        JSObject r = new JSObject(); r.put("count", keep.length());
        call.resolve(r);
    }

    @PluginMethod
    public void takeEvents(PluginCall call) {
        JSONArray ev = HabitAlarms.takeEvents(getContext());
        JSObject r = new JSObject();
        try { r.put("events", new JSArray(ev.toString())); } catch (Exception e) { r.put("events", new JSArray()); }
        call.resolve(r);
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        HabitAlarms.dismiss(getContext(), call.getInt("id", 0));
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        r.put("exact", Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms()));
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        r.put("fullScreen", Build.VERSION.SDK_INT < 34 || (nm != null && nm.canUseFullScreenIntent()));
        r.put("notif", NotificationManagerCompat.from(c).areNotificationsEnabled());
        r.put("overlay", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c));
        call.resolve(r);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context c = getContext();
        String type = call.getString("type", "notif");
        Uri pkg = Uri.parse("package:" + c.getPackageName());
        Intent i;
        if ("exact".equals(type) && Build.VERSION.SDK_INT >= 31) i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg);
        else if ("overlay".equals(type) && Build.VERSION.SDK_INT >= 23) i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pkg);
        else if ("fullScreen".equals(type) && Build.VERSION.SDK_INT >= 34) i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg);
        else if (Build.VERSION.SDK_INT >= 26) i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        else i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { c.startActivity(i); } catch (Exception e) {
            try { c.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception ignored) {}
        }
        call.resolve();
    }

    /** Prueba: muestra la pantalla en N segundos. */
    @PluginMethod
    public void test(PluginCall call) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", 2999);
            o.put("at", System.currentTimeMillis() + call.getInt("sec", 5) * 1000L);
            o.put("title", call.getString("title", "Así se verá tu recordatorio"));
            o.put("body", call.getString("body", ""));
            o.put("time", call.getString("time", ""));
            o.put("habit", ""); o.put("day", ""); o.put("name", "");
            o.put("ring", call.getInt("ring", 10));
            HabitAlarms.channel(getContext());
            HabitAlarms.arm(getContext(), o);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }
}
