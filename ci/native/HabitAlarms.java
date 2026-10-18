package pe.edgwr.cuadernohierro;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Alarmas de hábitos a pantalla completa (como la app Recordatorios de Samsung). */
public class HabitAlarms {
    static final String PREFS = "forja_habit_alarms";
    static final String CH = "habitos_ding";   // canal sin sonido propio: el ding dong lo toca la app por el canal de alarma
    static final String CH_OLD = "habitos_alarma";
    static final String A_FIRE = "pe.edgwr.cuadernohierro.HABIT_FIRE";
    static final String A_DONE = "pe.edgwr.cuadernohierro.HABIT_DONE";
    static final String A_SNOOZE = "pe.edgwr.cuadernohierro.HABIT_SNOOZE";
    static final String A_DISMISS = "pe.edgwr.cuadernohierro.HABIT_DISMISS";

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
        if (nm == null) return;
        if (nm.getNotificationChannel(CH_OLD) != null) nm.deleteNotificationChannel(CH_OLD);   // el viejo sonaba con el tono de notificación y vibraba 3 veces
        if (nm.getNotificationChannel(CH) != null) return;
        NotificationChannel ch = new NotificationChannel(CH, "Hábitos a pantalla completa", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Recordatorios de hábitos que aparecen en toda la pantalla, con un ding dong corto");
        ch.enableVibration(false);
        ch.setSound(null, null);
        ch.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    /* "Ding dong" corto (~2,5 s, una sola vez) sintetizado aquí: dos campanadas (Mi5 → Do5) con armónicos y caída suave.
       Sale por el canal de ALARMA (se oye aunque el celular esté en silencio o en vibración) y vibra una sola vez. */
    static final AudioAttributes ALARM_ATTR = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
    static void ding(Context c) {
        try {
            final int rate = 22050, n = (int) (rate * 2.6);
            short[] pcm = new short[n];
            double[][] notes = { { 659.25, 0.0, 1.3 }, { 523.25, 0.55, 2.05 } };   // frecuencia, inicio (s), duración (s)
            for (double[] nt : notes) {
                int a = (int) (nt[1] * rate), len = (int) (nt[2] * rate);
                for (int k = 0; k < len && a + k < n; k++) {
                    double t = (double) k / rate, env = Math.min(1, t / 0.006) * Math.exp(-t * 2.6);
                    double v = Math.sin(2 * Math.PI * nt[0] * t) + 0.45 * Math.sin(2 * Math.PI * nt[0] * 2.76 * t) * Math.exp(-t * 6) + 0.25 * Math.sin(2 * Math.PI * nt[0] * 2 * t);
                    int x = pcm[a + k] + (int) (v * env * 0.42 * 32767 / 1.7);
                    pcm[a + k] = (short) Math.max(-32767, Math.min(32767, x));
                }
            }
            final AudioTrack tr = new AudioTrack(ALARM_ATTR, new AudioFormat.Builder().setSampleRate(rate).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build(), n * 2, AudioTrack.MODE_STATIC, 0);
            tr.write(pcm, 0, n);
            tr.play();
            new Handler(Looper.getMainLooper()).postDelayed(() -> { try { tr.stop(); } catch (Throwable t) { } try { tr.release(); } catch (Throwable t) { } }, 3000);
        } catch (Throwable t) { }
        try {
            Vibrator vib = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
            if (vib != null) {
                if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createOneShot(450, VibrationEffect.DEFAULT_AMPLITUDE), ALARM_ATTR);
                else vib.vibrate(450);
            }
        } catch (Throwable t) { }
    }
    /** Menos de 30 s = ding dong corto (los recordatorios viejos traen ring 10); 30 o 60 = alarma en bucle en la pantalla completa. */
    static boolean isDing(JSONObject o) { return o.optInt("ring", 3) < 30; }

    static PendingIntent actionPI(Context c, String action, int id, String item) {
        Intent i = new Intent(c, HabitAlarmReceiver.class).setAction(action).putExtra("item", item);
        int rc = id * 4 + (A_DONE.equals(action) ? 1 : A_SNOOZE.equals(action) ? 2 : 0);
        return PendingIntent.getBroadcast(c, rc, i, flags(PendingIntent.FLAG_UPDATE_CURRENT));
    }

    static void show(Context c, JSONObject o) {
        channel(c);
        final int id = o.optInt("id");
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
            .setDefaults(0)
            .setSound(null)
            .setVibrate(null)
            .setAutoCancel(true)
            .setContentIntent(fullPI)
            .setFullScreenIntent(fullPI, true)
            .addAction(0, "✓ Hecho", actionPI(c, A_DONE, id, item))
            .addAction(0, "Aplazar " + againText(snzOf(o)), actionPI(c, A_SNOOZE, id, item))
            .setDeleteIntent(actionPI(c, A_DISMISS, id, item));   // deslizar la notificación = ✕
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, b.build());
        /* Cómo se abre la pantalla completa:
           - Bloqueado o con la pantalla apagada: la abre Android por la notificación (setFullScreenIntent), si la app
             tiene "Notificaciones de pantalla completa" (Android 14+).
           - Con "Aparecer encima de otras apps" la abrimos nosotros (Android lo permite desde segundo plano), con el
             celular en uso o bloqueado. Si a los 2,2 s no se abrió, se muestra igual como ventana superpuesta.
           - Sin ninguno de los dos, con el celular en uso Android solo muestra la notificación arriba.
           Cada aviso queda en un registro (log) que la app muestra en Ajustes → Recordatorios con el motivo. */
        final Context app = c.getApplicationContext();
        final long fired = System.currentTimeMillis();
        boolean on = true, locked = false, over = false, fsi = true, exact = true;
        try {
            android.os.PowerManager pm = (android.os.PowerManager) c.getSystemService(Context.POWER_SERVICE);
            on = pm == null || pm.isInteractive();
            android.app.KeyguardManager km = (android.app.KeyguardManager) c.getSystemService(Context.KEYGUARD_SERVICE);
            locked = km != null && km.isKeyguardLocked();
            over = Build.VERSION.SDK_INT >= 23 && android.provider.Settings.canDrawOverlays(c);
            fsi = Build.VERSION.SDK_INT < 34 || (nm != null && nm.canUseFullScreenIntent());
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            exact = Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms());
        } catch (Exception ignored) {}
        logFire(app, o, fired, on, locked, over, fsi, exact);
        final boolean opens = over || ((!on || locked) && fsi);
        /* Ding dong siempre en el modo corto. Con alarma de 30 s / 1 min suena el bucle de la pantalla completa;
           si esta no se abre, al menos el ding dong. */
        if (isDing(o) || !opens) ding(c);
        if (over) openWithVeil(app, full);
        final boolean ov = over;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            String res;
            if (openedSince(id, fired)) res = "act";
            else if (ov && showOverlay(app, o)) res = "ovl";
            else res = "notif";
            removeVeil(app);
            logResult(app, id, fired, res);
            if (!"act".equals(res) && opens && !isDing(o)) ding(app);
        }, 2200);
    }

    /* ---------- ¿Se abrió la pantalla? (la marca HabitAlarmActivity al crearse) ---------- */
    static volatile int openedId = -1;
    static volatile long openedAt = 0;
    static void markOpened(Context c, int id) {
        openedId = id; openedAt = System.currentTimeMillis();
        logOpened(c.getApplicationContext(), id);
    }
    static boolean openedSince(int id, long t) { return openedId == id && openedAt >= t - 1000; }

    /* Abrir la pantalla desde segundo plano con "Aparecer encima": ya mismo y, por si el sistema pide además una
       ventana visible (algunas versiones), otra vez a los 0,9 s con una ventana de 1 px transparente puesta. */
    static android.view.View veil;
    static void openWithVeil(final Context app, final Intent full) {
        final long t0 = System.currentTimeMillis();
        try { app.startActivity(full); } catch (Exception ignored) { }
        addVeil(app);
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (openedAt >= t0) return;
            try { app.startActivity(full); } catch (Exception ignored) { }
        }, 900);
    }
    static void addVeil(Context app) {
        try {
            removeVeil(app);
            android.view.WindowManager wm = (android.view.WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
            android.view.WindowManager.LayoutParams lp = new android.view.WindowManager.LayoutParams(1, 1, overlayType(),
                android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE | android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                android.graphics.PixelFormat.TRANSLUCENT);
            lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
            android.view.View v = new android.view.View(app);
            wm.addView(v, lp);
            veil = v;
        } catch (Throwable ignored) { }
    }
    static void removeVeil(Context c) {
        android.view.View v = veil; veil = null;
        if (v == null) return;
        try { ((android.view.WindowManager) c.getApplicationContext().getSystemService(Context.WINDOW_SERVICE)).removeView(v); } catch (Throwable ignored) { }
    }
    @SuppressWarnings("deprecation")
    static int overlayType() {
        return Build.VERSION.SDK_INT >= 26 ? android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : android.view.WindowManager.LayoutParams.TYPE_PHONE;
    }

    /* ---------- Respaldo: el recordatorio como ventana superpuesta a pantalla completa ---------- */
    static android.view.View ovl;
    static int ovlId = -1;
    static boolean showOverlay(final Context app, JSONObject o) {
        try {
            removeOverlay(app);
            android.view.WindowManager wm = (android.view.WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
            android.view.WindowManager.LayoutParams lp = new android.view.WindowManager.LayoutParams(
                android.view.WindowManager.LayoutParams.MATCH_PARENT, android.view.WindowManager.LayoutParams.MATCH_PARENT, overlayType(),
                android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                android.graphics.PixelFormat.TRANSLUCENT);
            android.view.View v = buildUi(app, o, () -> removeOverlay(app));
            wm.addView(v, lp);
            ovl = v; ovlId = o.optInt("id");
            return true;
        } catch (Throwable t) { ovl = null; ovlId = -1; return false; }
    }
    static void removeOverlay(Context c) {
        android.view.View v = ovl; ovl = null; ovlId = -1;
        if (v == null) return;
        try { ((android.view.WindowManager) c.getApplicationContext().getSystemService(Context.WINDOW_SERVICE)).removeView(v); } catch (Throwable ignored) { }
    }

    /* ---------- La vista del recordatorio (la usan la pantalla completa y la ventana superpuesta) ---------- */
    static int dp(Context c, float v) { return Math.round(android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_DIP, v, c.getResources().getDisplayMetrics())); }
    static android.widget.TextView text(Context c, String s, float sp, boolean bold) {
        android.widget.TextView t = new android.widget.TextView(c);
        t.setText(s); t.setTextColor(android.graphics.Color.WHITE); t.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, sp);
        t.setGravity(android.view.Gravity.CENTER);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return t;
    }
    static android.widget.TextView circle(Context c, String s, boolean filled) {
        android.widget.TextView t = text(c, s, 34, false);
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        if (filled) { g.setColor(0xFFFAFAFA); t.setTextColor(0xFFFF5A1F); }
        else { g.setColor(0x33FFFFFF); g.setStroke(dp(c, 3), android.graphics.Color.WHITE); }
        t.setBackground(g);
        t.setLayoutParams(new android.widget.LinearLayout.LayoutParams(dp(c, 86), dp(c, 86)));
        return t;
    }
    static String okText(JSONObject o) {
        String ok = o.optString("ok", "");
        return ok.length() > 0 ? ok : "¡Hecho! " + o.optString("name", "");
    }
    static void toast(Context c, String s) { try { android.widget.Toast.makeText(c, s, android.widget.Toast.LENGTH_SHORT).show(); } catch (Throwable ignored) { } }
    static android.view.View buildUi(final Context c, final JSONObject item, final Runnable close) {
        final int id = item.optInt("id");
        android.widget.FrameLayout root = new android.widget.FrameLayout(c);
        root.setBackground(new android.graphics.drawable.GradientDrawable(android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM, new int[] { 0xFF0B0D12, 0xFF2A1410, 0xFF8A3414, 0xFFFF6A1F }));
        root.setClickable(true);   // la ventana superpuesta no deja pasar toques a la app de abajo

        android.widget.LinearLayout top = new android.widget.LinearLayout(c);
        top.setOrientation(android.widget.LinearLayout.VERTICAL);
        top.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        top.setPadding(dp(c, 28), dp(c, 140), dp(c, 28), 0);
        android.widget.TextView title = text(c, item.optString("title", "Recordatorio"), 34, true);
        title.setLineSpacing(0, 1.05f);
        top.addView(title);
        android.widget.TextView sub = text(c, "Hoy · " + item.optString("time", ""), 18, false);
        sub.setPadding(0, dp(c, 14), 0, 0); sub.setAlpha(0.9f);
        top.addView(sub);
        String body = item.optString("body", "");
        if (body.length() > 0) { android.widget.TextView bd = text(c, body, 15, false); bd.setPadding(0, dp(c, 18), 0, 0); bd.setAlpha(0.75f); top.addView(bd); }
        root.addView(top, new android.widget.FrameLayout.LayoutParams(-1, -2, android.view.Gravity.TOP));

        android.widget.LinearLayout bottom = new android.widget.LinearLayout(c);
        bottom.setOrientation(android.widget.LinearLayout.VERTICAL);
        bottom.setPadding(dp(c, 36), 0, dp(c, 36), dp(c, 56));

        android.widget.LinearLayout row = new android.widget.LinearLayout(c);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        android.widget.TextView no = circle(c, "✕", true);
        no.setContentDescription("Descartar");
        no.setOnClickListener(v -> {
            if (again(c, item)) toast(c, "Te lo recuerdo en " + againText(item.optInt("again")));
            else dismiss(c, id);
            close.run();
        });
        android.widget.TextView yes = circle(c, "✓", false);
        yes.setContentDescription("Hecho");
        yes.setOnClickListener(v -> { done(c, item); toast(c, okText(item)); close.run(); });
        row.addView(no);
        row.addView(new android.view.View(c), new android.widget.LinearLayout.LayoutParams(0, 1, 1f));
        row.addView(yes);
        bottom.addView(row);

        android.widget.LinearLayout sn = new android.widget.LinearLayout(c);
        sn.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        sn.setGravity(android.view.Gravity.CENTER_VERTICAL);
        sn.setPadding(0, dp(c, 44), 0, 0);
        android.widget.TextView minus = text(c, "—", 30, false);
        minus.setContentDescription("Menos minutos");
        minus.setLayoutParams(new android.widget.LinearLayout.LayoutParams(dp(c, 56), dp(c, 56)));
        android.widget.TextView plus = text(c, "+", 36, false);
        plus.setContentDescription("Más minutos");
        plus.setLayoutParams(new android.widget.LinearLayout.LayoutParams(dp(c, 56), dp(c, 56)));
        final int[] snz = { snzOf(item) };
        final android.widget.TextView snoozeBtn = text(c, "Aplazar " + againText(snz[0]), 18, true);
        android.graphics.drawable.GradientDrawable pill = new android.graphics.drawable.GradientDrawable();
        pill.setColor(0x33FFFFFF); pill.setCornerRadius(dp(c, 40));
        snoozeBtn.setBackground(pill);
        snoozeBtn.setPadding(dp(c, 22), dp(c, 14), dp(c, 22), dp(c, 14));
        /* Solo esa vez: de 1 en 1 hasta 10 min y luego de 5 en 5 (de 1 min a 12 h) */
        minus.setOnClickListener(v -> { snz[0] = snz[0] <= 10 ? Math.max(1, snz[0] - 1) : snz[0] - 5; snoozeBtn.setText("Aplazar " + againText(snz[0])); });
        plus.setOnClickListener(v -> { snz[0] = snz[0] < 10 ? snz[0] + 1 : Math.min(720, snz[0] + 5); snoozeBtn.setText("Aplazar " + againText(snz[0])); });
        snoozeBtn.setOnClickListener(v -> { snooze(c, item, snz[0]); toast(c, "Te lo recuerdo en " + againText(snz[0])); close.run(); });
        sn.addView(minus);
        android.widget.LinearLayout.LayoutParams mid = new android.widget.LinearLayout.LayoutParams(0, -2, 1f);
        mid.leftMargin = dp(c, 10); mid.rightMargin = dp(c, 10);
        sn.addView(snoozeBtn, mid);
        sn.addView(plus);
        bottom.addView(sn);

        root.addView(bottom, new android.widget.FrameLayout.LayoutParams(-1, -2, android.view.Gravity.BOTTOM));
        return root;
    }

    static void dismiss(Context c, int id) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(id);
        if (ovl != null && ovlId == id) removeOverlay(c);
    }

    /** Hecho: la app lo lee al abrirse (takeEvents). Hábito = lo marca; agua = suma un vaso (250 ml). */
    static void done(Context c, JSONObject o) {
        JSONArray ev = load(c, "events");
        try {
            JSONObject e = new JSONObject();
            e.put("habit", o.optString("habit"));
            e.put("kind", o.optString("kind", ""));
            if ("water".equals(o.optString("kind"))) e.put("water", 250);
            e.put("day", o.optString("day"));
            e.put("at", System.currentTimeMillis());
            ev.put(e);
        } catch (JSONException ignored) {}
        prefs(c).edit().putString("events", ev.toString()).apply();
        dismiss(c, o.optInt("id"));
    }

    /* ---------- Registro de los últimos avisos (para ver en la app por qué no se abrió) ---------- */
    static void logFire(Context c, JSONObject o, long fired, boolean on, boolean locked, boolean over, boolean fsi, boolean exact) {
        try {
            JSONArray l = load(c, "log"), out = new JSONArray();
            for (int k = Math.max(0, l.length() - 11); k < l.length(); k++) out.put(l.get(k));
            JSONObject e = new JSONObject();
            e.put("id", o.optInt("id")); e.put("title", o.optString("title")); e.put("kind", o.optString("kind", ""));
            e.put("at", o.optLong("at")); e.put("fired", fired);
            e.put("on", on); e.put("locked", locked); e.put("over", over); e.put("fsi", fsi); e.put("exact", exact);
            e.put("sdk", Build.VERSION.SDK_INT); e.put("res", "");
            out.put(e);
            prefs(c).edit().putString("log", out.toString()).apply();
        } catch (Exception ignored) {}
    }
    static void logResult(Context c, int id, long fired, String res) {
        try {
            JSONArray l = load(c, "log");
            for (int k = l.length() - 1; k >= 0; k--) {
                JSONObject e = l.optJSONObject(k);
                if (e != null && e.optInt("id") == id && e.optLong("fired") == fired) { if (!"act".equals(e.optString("res"))) e.put("res", res); break; }
            }
            prefs(c).edit().putString("log", l.toString()).apply();
        } catch (Exception ignored) {}
    }
    /* La pantalla se abrió (quizá tarde, al encender el celular): el último aviso de ese id queda como abierto */
    static void logOpened(Context c, int id) {
        try {
            JSONArray l = load(c, "log");
            long now = System.currentTimeMillis();
            for (int k = l.length() - 1; k >= 0; k--) {
                JSONObject e = l.optJSONObject(k);
                if (e == null || e.optInt("id") != id) continue;
                if (now - e.optLong("fired") < 30 * 60000L && !"act".equals(e.optString("res"))) { e.put("res", "act"); e.put("late", now - e.optLong("fired")); }
                break;
            }
            prefs(c).edit().putString("log", l.toString()).apply();
        } catch (Exception ignored) {}
    }

    /** ✕ (o deslizar la notificación): si el recordatorio pide "avisar de nuevo en N min" (`again`), se reprograma
        para ese mismo día y antes de las 23:00. Devuelve false si no hay repetición (queda descartado). */
    static boolean again(Context c, JSONObject o) {
        int min = o.optInt("again", 0);
        if (min <= 0) return false;
        long next = System.currentTimeMillis() + min * 60000L;
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.setTimeInMillis(next);
        String day = String.format(java.util.Locale.US, "%04d-%02d-%02d", cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1, cal.get(java.util.Calendar.DAY_OF_MONTH));
        if (!day.equals(o.optString("day")) || cal.get(java.util.Calendar.HOUR_OF_DAY) >= 23) return false;
        snooze(c, o, min);
        return true;
    }
    /** "7 min", "1 hora", "1 h 30 min", "2 horas" */
    static String againText(int min) { if (min < 60) return min + " min"; int h = min / 60, m = min % 60; return m > 0 ? h + " h " + m + " min" : h + (h == 1 ? " hora" : " horas"); }
    /** Tiempo de Aplazar de ese recordatorio (minutos; 15 si no tiene), entre 1 min y 12 h */
    static int snzOf(JSONObject o) { int m = o.optInt("snz", 15); return Math.max(1, Math.min(720, m <= 0 ? 15 : m)); }

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
