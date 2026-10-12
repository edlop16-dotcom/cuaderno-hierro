package pe.edgwr.cuadernohierro;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Pasos del día con el sensor TYPE_STEP_COUNTER (cuenta desde que se encendió el equipo).
 * Guarda el valor del sensor al inicio del día y suma lo de antes de un reinicio.
 * Una alarma a las 23:58 toma una foto del contador para que el día siguiente arranque bien.
 */
public class StepStore {
    static final String PREFS = "forja_steps";
    static final String A_SNAP = "pe.edgwr.cuadernohierro.STEP_SNAP";

    interface Cb { void done(long steps); }

    static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }

    static synchronized long apply(Context c, float raw) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long val = (long) raw;
        String t = today(), day = p.getString("day", null);
        long base = p.getLong("base", val), acc = p.getLong("acc", 0), last = p.getLong("last", val);
        if (day == null) { base = val; acc = 0; }
        else if (!day.equals(t)) { base = val >= last ? last : 0; acc = 0; }
        else if (val < last) { acc += Math.max(0, last - base); base = 0; }
        long steps = Math.max(0, acc + (val - base));
        p.edit().putString("day", t).putLong("base", base).putLong("acc", acc).putLong("last", val).putLong("today", steps).apply();
        return steps;
    }

    static boolean has(Context c) {
        SensorManager sm = (SensorManager) c.getSystemService(Context.SENSOR_SERVICE);
        return sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;
    }

    /** Lee el contador una vez (máx. 4 s) y devuelve los pasos de hoy, o -1. */
    static void read(Context c, Cb cb) {
        final Context app = c.getApplicationContext();
        SensorManager sm = (SensorManager) app.getSystemService(Context.SENSOR_SERVICE);
        Sensor s = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (s == null) { cb.done(-1); return; }
        final Handler h = new Handler(Looper.getMainLooper());
        final boolean[] fin = { false };
        final SensorEventListener[] ref = new SensorEventListener[1];
        ref[0] = new SensorEventListener() {
            @Override public void onSensorChanged(SensorEvent e) {
                if (fin[0]) return; fin[0] = true;
                sm.unregisterListener(this);
                cb.done(apply(app, e.values[0]));
            }
            @Override public void onAccuracyChanged(Sensor sensor, int a) {}
        };
        try { sm.registerListener(ref[0], s, SensorManager.SENSOR_DELAY_NORMAL, 0, h); }
        catch (SecurityException ex) { cb.done(-1); return; }
        h.postDelayed(() -> {
            if (fin[0]) return; fin[0] = true;
            sm.unregisterListener(ref[0]);
            SharedPreferences p = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            cb.done(today().equals(p.getString("day", "")) ? p.getLong("today", 0) : -1);
        }, 4000);
    }

    /** Foto del contador a las 23:58 de cada día. */
    static void armNightly(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Calendar k = Calendar.getInstance();
        k.set(Calendar.HOUR_OF_DAY, 23); k.set(Calendar.MINUTE, 58); k.set(Calendar.SECOND, 0); k.set(Calendar.MILLISECOND, 0);
        if (k.getTimeInMillis() <= System.currentTimeMillis()) k.add(Calendar.DAY_OF_MONTH, 1);
        Intent i = new Intent(c, HabitAlarmReceiver.class).setAction(A_SNAP);
        PendingIntent pi = PendingIntent.getBroadcast(c, 2998, i, HabitAlarms.flags(PendingIntent.FLAG_UPDATE_CURRENT));
        if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, k.getTimeInMillis(), pi);
        else am.set(AlarmManager.RTC_WAKEUP, k.getTimeInMillis(), pi);
    }
}
