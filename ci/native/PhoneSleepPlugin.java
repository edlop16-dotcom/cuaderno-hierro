package pe.edgwr.cuadernohierro;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sueño estimado con el uso del celular: Android registra cuándo se prende y se apaga la pantalla
 * (UsageStatsManager, eventos SCREEN_INTERACTIVE / SCREEN_NON_INTERACTIVE, Android 9+).
 * Necesita el permiso especial "Acceso a datos de uso", que el usuario activa en Ajustes.
 */
@CapacitorPlugin(name = "PhoneSleep")
public class PhoneSleepPlugin extends Plugin {

    private boolean access() {
        try {
            AppOpsManager ao = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
            int mode = Build.VERSION.SDK_INT >= 29
                ? ao.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), getContext().getPackageName())
                : ao.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), getContext().getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) { return false; }
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("supported", Build.VERSION.SDK_INT >= 28);
        r.put("access", access());
        call.resolve(r);
    }

    @PluginMethod
    public void openAccess(PluginCall call) {
        Context c = getContext();
        Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            Intent k = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, Uri.parse("package:" + c.getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(k);
        } catch (Exception e) {
            try { c.startActivity(i); } catch (Exception ignored) {}
        }
        call.resolve();
    }

    /** Eventos de pantalla entre from y to (ms): [[t, 1=prendida | 0=apagada], ...] */
    @PluginMethod
    public void screen(PluginCall call) {
        if (Build.VERSION.SDK_INT < 28) { call.reject("Necesita Android 9 o más nuevo"); return; }
        if (!access()) { call.reject("sin acceso"); return; }
        long to = call.getLong("to", System.currentTimeMillis());
        long from = call.getLong("from", to - 8L * 86400000L);
        JSArray out = new JSArray();
        try {
            UsageStatsManager um = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
            UsageEvents ev = um.queryEvents(from, to);
            UsageEvents.Event e = new UsageEvents.Event();
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e);
                int t = e.getEventType();
                if (t == UsageEvents.Event.SCREEN_INTERACTIVE || t == UsageEvents.Event.SCREEN_NON_INTERACTIVE) {
                    JSArray p = new JSArray();
                    p.put(e.getTimeStamp());
                    p.put(t == UsageEvents.Event.SCREEN_INTERACTIVE ? 1 : 0);
                    out.put(p);
                }
            }
        } catch (Exception ex) { call.reject("No se pudo leer: " + ex.getMessage()); return; }
        JSObject r = new JSObject();
        r.put("events", out);
        call.resolve(r);
    }
}
