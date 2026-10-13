package pe.edgwr.cuadernohierro;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Alarmas de hábitos a pantalla completa (como la app Recordatorios de Samsung). */
public class HabitAlarms {
    static final String PREFS = "forja_habit_alarms";
    static final String CH = "habitos_alarma";
    static final String A_FIRE = "pe.edgwr.cuadernohierro.HABIT_FIRE";
    static final String A_DONE = "pe.edgwr.cuadernohierro.HABIT_DONE";
    static final String A_SNOOZE = "pe.edgwr.cuadernohierro.HABIT_SNOOZE";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static JSONArray load(Context c, String key) {
        try { return new JSONArray(prefs(c).getString(key, "[]")); } catch (JSONException e) { return new JSONArray(); }
    }
    static void save(Context c, JSONArray items) { prefs(c).edit().putString("items", items.toString()).apply(); }

    static int flags(int f) { return Build.VERSION.SDK_INT >= 23 ? f | PendingIntent.FLAG_IMMUTABLE : f; }

    static PendingIntent firePI(Context c, int id, String item, int f) {
        Intent i = new Intent(c, HabitAlarmReceiver.class).setAction(A_FIRE);
        if (item != null) i.putExtra("item", item);
        return PendingIntent.getBroadcast(c, id, i, flags(f));
    }

    static void arm(Context c, JSONObject o) {
        long at = o.optLong("at", 0);
        if (at < System.currentTimeMillis() - 60000) return;
        int id = o.optInt("id");
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = firePI(c, id, o.toString(), PendingIntent.FLAG_UPDATE_CURRENT);
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        try {
            if (exact && Build.VERSION.SDK_INT >= 23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setExact(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static void cancelAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        JSONArray items = load(c, "items");
        for (int k = 0; k < items.length(); k++) {
            JSONObject o = items.optJSONObject(k); if (o == null) continue;
            PendingIntent pi = firePI(c, o.optInt("id"), null, PendingIntent.FLAG_NO_CREATE);
            if (pi != null && am != null) { am.cancel(pi); pi.cancel(); }
        }
    }

    static void rearm(Context c) {
        JSONArray items = load(c, "items");
        for (int k = 0; k < items.length(); k++) { JSONObject o = items.optJSONObject(k); if (o != null) arm(c, o); }
    }

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CH) != null) return;
        NotificationChannel ch = new NotificationChannel(CH, "Hábitos a pantalla completa", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Recordatorios de hábitos que aparecen en toda la pantalla");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[] { 0, 400, 250, 400, 250, 400 });
        ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        ch.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    static PendingIntent actionPI(Context c, String action, int id, String item) {
        Intent i = new Intent(c, HabitAlarmReceiver.class).setAction(action).putExtra("item", item);
        int rc = id * 4 + (A_DONE.equals(action) ? 1 : 2);
        return PendingIntent.getBroadcast(c, rc, i, flags(PendingIntent.FLAG_UPDATE_CURRENT));
    }

    static void show(Context c, JSONObject o) {
        channel(c);
        int id = o.optInt("id");
        String item = o.toString();
        Intent full = new Intent(c, HabitAlarmActivity.class).putExtra("item", item)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullPI = PendingIntent.getActivity(c, id * 4 + 3, full, flags(PendingIntent.FLAG_UPDATE_CURRENT));
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setColor(0xFFFF7A1A)
            .setContentTitle(o.optString("title", "Forja"))
            .setContentText(o.optString("body", ""))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(fullPI)
            .setFullScreenIntent(fullPI, true)
            .addAction(0, "✓ Hecho", actionPI(c, A_DONE, id, item))
            .addAction(0, "Aplazar 15 min", actionPI(c, A_SNOOZE, id, item));
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, b.build());
        /* Con el celular en uso Android solo muestra la notificación arriba. Si el usuario dio
           "Aparecer encima de otras apps", abrimos la pantalla completa igual (como la app Recordatorios). */
        try {
            android.os.PowerManager pm = (android.os.PowerManager) c.getSystemService(Context.POWER_SERVICE);
            boolean on = pm == null || pm.isInteractive();
            if (on && android.os.Build.VERSION.SDK_INT >= 23 && android.provider.Settings.canDrawOverlays(c)) c.startActivity(full);
        } catch (Exception ignored) {}
    }

    static void dismiss(Context c, int id) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(id);
    }

    /** Marca el hábito como hecho: la app lo lee al abrirse (takeEvents). */
    static void done(Context c, JSONObject o) {
        JSONArray ev = load(c, "events");
        try {
            JSONObject e = new JSONObject();
            e.put("habit", o.optString("habit"));
            e.put("day", o.optString("day"));
            e.put("at", System.currentTimeMillis());
            ev.put(e);
        } catch (JSONException ignored) {}
        prefs(c).edit().putString("events", ev.toString()).apply();
        dismiss(c, o.optInt("id"));
    }

    static void snooze(Context c, JSONObject o, int min) {
        dismiss(c, o.optInt("id"));
        try {
            JSONObject n = new JSONObject(o.toString());
            n.put("at", System.currentTimeMillis() + min * 60000L);
            n.put("snoozed", true);
            JSONArray items = load(c, "items"), out = new JSONArray();
            for (int k = 0; k < items.length(); k++) { JSONObject x = items.optJSONObject(k); if (x != null && x.optInt("id") != n.optInt("id")) out.put(x); }
            out.put(n);
            save(c, out);
            arm(c, n);
        } catch (JSONException ignored) {}
    }

    static JSONArray takeEvents(Context c) {
        JSONArray ev = load(c, "events");
        prefs(c).edit().putString("events", "[]").apply();
        return ev;
    }
}
