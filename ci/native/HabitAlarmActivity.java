package pe.edgwr.cuadernohierro;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import org.json.JSONObject;

/** Pantalla completa del recordatorio: ✕ descartar · ✓ hecho · aplazar N min (la vista la arma HabitAlarms.buildUi). */
public class HabitAlarmActivity extends Activity {
    private JSONObject item;
    private MediaPlayer player;
    private Vibrator vib;
    private final Handler h = new Handler(Looper.getMainLooper());

    /* Modo corto (por defecto): el ding dong ya sonó al llegar el recordatorio (HabitAlarms.show); aquí no suena nada.
       Alarma 30 s / 1 min: suena por el canal de alarma (se oye aunque el celular esté en silencio o vibración),
       en bucle hasta tocar un botón o subir/bajar el volumen, y se calla sola a los `ring` segundos. */
    private void ring() {
        if (item == null || HabitAlarms.isDing(item)) return;
        quiet();
        try {
            Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if (u != null) {
                player = new MediaPlayer();
                player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                player.setDataSource(this, u);
                player.setLooping(true);
                player.prepare();
                player.start();
            }
        } catch (Throwable t) { quiet(); }
        try {
            vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            long[] pat = new long[]{0, 600, 400, 600, 1200};
            if (vib != null) {
                if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createWaveform(pat, 0), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
                else vib.vibrate(pat, 0);
            }
        } catch (Throwable t) { }
        int sec = item.optInt("ring", 30);
        h.postDelayed(this::quiet, Math.max(3, Math.min(120, sec)) * 1000L);
    }

    private void quiet() {
        try { if (player != null) { player.stop(); player.release(); } } catch (Throwable t) { }
        player = null;
        try { if (vib != null) vib.cancel(); } catch (Throwable t) { }
        vib = null;
        h.removeCallbacksAndMessages(null);
    }

    @Override
    public void finish() { quiet(); super.finish(); }

    @Override
    protected void onDestroy() { quiet(); super.onDestroy(); }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN) { if (player != null || vib != null) { quiet(); return true; } }
        return super.onKeyDown(code, e);
    }

    /* Lee el recordatorio del intent y arma la vista; si ya estaba abierta (singleInstance) llega por onNewIntent */
    private boolean load(Intent i) {
        try { item = new JSONObject(i.getStringExtra("item")); } catch (Exception e) { return false; }
        HabitAlarms.removeVeil(this);
        HabitAlarms.removeOverlay(this);
        HabitAlarms.markOpened(this, item.optInt("id"));
        boolean rest = HabitAlarms.isRest(item);
        HabitAlarms.restAct = rest ? new java.lang.ref.WeakReference<android.app.Activity>(this) : null;
        setContentView(rest ? HabitAlarms.buildRestUi(this, item, this::finish) : HabitAlarms.buildUi(this, item, this::finish));
        return true;
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 27) {
            /* Encima de la pantalla de bloqueo, como una alarma: sin pedir el PIN (✓, ✕ y aplazar no lo necesitan) */
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            w.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 21) { w.setStatusBarColor(Color.TRANSPARENT); w.setNavigationBarColor(0xFFFF6A1F); }
        w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        if (!load(getIntent())) { finish(); return; }
        if (b == null) ring();
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        if (load(i)) ring();
    }

    @Override
    public void onBackPressed() { finish(); }
}
