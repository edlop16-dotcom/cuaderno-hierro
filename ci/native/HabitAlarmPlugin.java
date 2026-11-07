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
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import androidx.activity.result.ActivityResult;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "HabitAlarm")
public class HabitAlarmPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        Context c = getContext();
        JSArray items = call.getArray("items"), done = call.getArray("done");
        JSONArray prev = HabitAlarms.load(c, "items");
        HabitAlarms.cancelAll(c);
        JSONArray keep = new JSONArray();
        java.util.HashSet<Integer> ids = new java.util.HashSet<>();
        java.util.HashSet<String> doneK = new java.util.HashSet<>();
        try {
            if (done != null) for (int k = 0; k < done.length(); k++) doneK.add(done.getString(k));
            if (items != null) for (int k = 0; k < items.length(); k++) {
                JSONObject o = items.getJSONObject(k);
                ids.add(o.optInt("id"));
                keep.put(o);
                HabitAlarms.arm(c, o);
            }
            /* Repeticiones creadas aquí (✕ con "avisar de nuevo" o Aplazar desde la notificación): siguen vivas
               al reprogramar desde la app, salvo que ese hábito ya esté hecho hoy */
            long now = System.currentTimeMillis();
            for (int k = 0; k < prev.length(); k++) {
                JSONObject o = prev.optJSONObject(k);
                if (o == null || !o.optBoolean("snoozed") || o.optLong("at") <= now || ids.contains(o.optInt("id")) || doneK.contains(o.optString("habit"))) continue;
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

    /** Últimos avisos: hora programada y real, estado del celular y permisos, y si se abrió la pantalla completa. */
    @PluginMethod
    public void log(PluginCall call) {
        JSObject r = new JSObject();
        try { r.put("log", new JSArray(HabitAlarms.load(getContext(), "log").toString())); } catch (Exception e) { r.put("log", new JSArray()); }
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
        r.put("sdk", Build.VERSION.SDK_INT);
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

    /** Fin del descanso (I2): a la hora `at`, si la pantalla está apagada, la enciende con "Descanso terminado". */
    @PluginMethod
    public void rest(PluginCall call) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", HabitAlarms.REST_ID);
            o.put("kind", "rest");
            /* getDouble y getLong no sirven aquí: una hora en milisegundos llega como Long y getDouble devuelve null
               (el aviso salía al instante, con el descanso aún corriendo). optLong acepta cualquier número. */
            long at = call.getData().optLong("at", 0);
            if (at <= 0) { call.reject("Falta la hora de fin del descanso"); return; }
            o.put("at", at);
            o.put("title", call.getString("title", "Descanso terminado"));
            o.put("body", call.getString("body", ""));
            o.put("snd", call.getBoolean("snd", true));
            o.put("vib", call.getBoolean("vib", true));
            o.put("auto", call.getBoolean("auto", false));   /* Pantalla automática: la pantalla del descanso se cierra sola a los 10 s */
            HabitAlarms.channel(getContext());
            HabitAlarms.arm(getContext(), o);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    /** Sesión en curso con la pantalla bloqueada (ajustes-gym-2): `on` deja ver solo la pantalla de la sesión encima del
     *  bloqueo, como un cronómetro. Al apagarlo (terminar, salir a otra parte), si el celular está bloqueado, Android vuelve
     *  a mostrar el bloqueo y pide el patrón. Devuelve `locked` para que la app tape la pantalla mientras tanto. */
    @PluginMethod
    public void sessionLock(final PluginCall call) {
        final boolean on = call.getBoolean("on", false);
        final android.app.Activity a = getActivity();
        HabitAlarms.sessShow = on;
        if (a == null) { JSObject r = new JSObject(); r.put("locked", false); call.resolve(r); return; }
        a.runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= 27) a.setShowWhenLocked(on);
                else if (on) a.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
                else a.getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
            } catch (Throwable t) { }
            android.app.KeyguardManager km = (android.app.KeyguardManager) a.getSystemService(Context.KEYGUARD_SERVICE);
            JSObject r = new JSObject();
            r.put("locked", km != null && km.isKeyguardLocked());
            call.resolve(r);
        });
    }

    /** Pantalla automática (ajustes-gym-3): brillo al mínimo mientras la app pone la pantalla negra. Android no deja apagar
     *  la pantalla sin permisos de administrador; esto es solo el brillo de esta ventana y se quita con `on: false`. */
    @PluginMethod
    public void dim(final PluginCall call) {
        final boolean on = call.getBoolean("on", false);
        final android.app.Activity a = getActivity();
        if (a == null) { call.resolve(); return; }
        a.runOnUiThread(() -> {
            try {
                android.view.WindowManager.LayoutParams lp = a.getWindow().getAttributes();
                lp.screenBrightness = on ? 0.01f : android.view.WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
                a.getWindow().setAttributes(lp);
            } catch (Throwable t) { }
            call.resolve();
        });
    }

    /** Pide el patrón, PIN o huella del celular con la pantalla de Android (sin permisos nuevos). Sin bloqueo configurado: ok. */
    @PluginMethod
    public void confirmUnlock(PluginCall call) {
        android.app.KeyguardManager km = (android.app.KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        boolean secure = km != null && (Build.VERSION.SDK_INT >= 23 ? km.isDeviceSecure() : km.isKeyguardSecure());
        Intent i = secure ? km.createConfirmDeviceCredentialIntent("Forja", "Confirma que eres tú para salir de la sesión") : null;
        if (i == null) { JSObject r = new JSObject(); r.put("ok", true); r.put("secure", false); call.resolve(r); return; }
        startActivityForResult(call, i, "confirmResult");
    }

    @ActivityCallback
    private void confirmResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        r.put("ok", result != null && result.getResultCode() == android.app.Activity.RESULT_OK);
        r.put("secure", true);
        call.resolve(r);
    }

    @PluginMethod
    public void restCancel(PluginCall call) {
        HabitAlarms.restCancel(getContext());
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
            o.put("habit", ""); o.put("day", ""); o.put("name", ""); o.put("ok", "¡Listo! Así se verán tus recordatorios");
            o.put("ring", call.getInt("ring", 10));
            HabitAlarms.channel(getContext());
            HabitAlarms.arm(getContext(), o);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }
}
