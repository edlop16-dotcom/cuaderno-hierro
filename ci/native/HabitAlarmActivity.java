package pe.edgwr.cuadernohierro;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

/** Pantalla completa del recordatorio: ✕ descartar · ✓ hecho · aplazar N min. */
public class HabitAlarmActivity extends Activity {
    private JSONObject item;
    private int snoozeMin = 15;
    private TextView snoozeBtn;

    private int dp(float v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        try { item = new JSONObject(getIntent().getStringExtra("item")); } catch (Exception e) { finish(); return; }
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            w.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 21) { w.setStatusBarColor(Color.TRANSPARENT); w.setNavigationBarColor(0xFFFF6A1F); }
        w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        setContentView(build());
    }

    private TextView text(String s, float sp, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s); t.setTextColor(Color.WHITE); t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private TextView circle(String s, boolean filled) {
        TextView t = text(s, 34, false);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        if (filled) { g.setColor(0xFFFAFAFA); t.setTextColor(0xFFFF5A1F); }
        else { g.setColor(0x33FFFFFF); g.setStroke(dp(3), Color.WHITE); }
        t.setBackground(g);
        t.setLayoutParams(new LinearLayout.LayoutParams(dp(86), dp(86)));
        return t;
    }

    private View build() {
        FrameLayout root = new FrameLayout(this);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[] { 0xFF0B0D12, 0xFF2A1410, 0xFF8A3414, 0xFFFF6A1F });
        root.setBackground(bg);

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.VERTICAL);
        top.setGravity(Gravity.CENTER_HORIZONTAL);
        top.setPadding(dp(28), dp(140), dp(28), 0);
        TextView title = text(item.optString("title", "Recordatorio"), 34, true);
        title.setLineSpacing(0, 1.05f);
        top.addView(title);
        TextView sub = text("Hoy · " + item.optString("time", ""), 18, false);
        sub.setPadding(0, dp(14), 0, 0); sub.setAlpha(0.9f);
        top.addView(sub);
        String body = item.optString("body", "");
        if (body.length() > 0) { TextView bd = text(body, 15, false); bd.setPadding(0, dp(18), 0, 0); bd.setAlpha(0.75f); top.addView(bd); }
        root.addView(top, new FrameLayout.LayoutParams(-1, -2, Gravity.TOP));

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(dp(36), 0, dp(36), dp(56));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        TextView no = circle("✕", true);
        no.setContentDescription("Descartar");
        no.setOnClickListener(v -> { HabitAlarms.dismiss(this, item.optInt("id")); finish(); });
        View gap = new View(this);
        TextView yes = circle("✓", false);
        yes.setContentDescription("Hecho");
        yes.setOnClickListener(v -> { HabitAlarms.done(this, item); Toast.makeText(this, "¡Hecho! " + item.optString("name"), Toast.LENGTH_SHORT).show(); finish(); });
        row.addView(no);
        row.addView(gap, new LinearLayout.LayoutParams(0, 1, 1f));
        row.addView(yes);
        bottom.addView(row);

        LinearLayout sn = new LinearLayout(this);
        sn.setOrientation(LinearLayout.HORIZONTAL);
        sn.setGravity(Gravity.CENTER_VERTICAL);
        sn.setPadding(0, dp(44), 0, 0);
        TextView minus = text("—", 30, false);
        minus.setContentDescription("Menos minutos");
        minus.setLayoutParams(new LinearLayout.LayoutParams(dp(56), dp(56)));
        TextView plus = text("+", 36, false);
        plus.setContentDescription("Más minutos");
        plus.setLayoutParams(new LinearLayout.LayoutParams(dp(56), dp(56)));
        snoozeBtn = text("", 18, true);
        GradientDrawable pill = new GradientDrawable();
        pill.setColor(0x33FFFFFF); pill.setCornerRadius(dp(40));
        snoozeBtn.setBackground(pill);
        snoozeBtn.setPadding(dp(22), dp(14), dp(22), dp(14));
        setSnooze(15);
        minus.setOnClickListener(v -> setSnooze(snoozeMin - 5));
        plus.setOnClickListener(v -> setSnooze(snoozeMin + 5));
        snoozeBtn.setOnClickListener(v -> { HabitAlarms.snooze(this, item, snoozeMin); Toast.makeText(this, "Te lo recuerdo en " + snoozeMin + " min", Toast.LENGTH_SHORT).show(); finish(); });
        sn.addView(minus);
        LinearLayout.LayoutParams mid = new LinearLayout.LayoutParams(0, -2, 1f);
        mid.leftMargin = dp(10); mid.rightMargin = dp(10);
        sn.addView(snoozeBtn, mid);
        sn.addView(plus);
        bottom.addView(sn);

        root.addView(bottom, new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM));
        return root;
    }

    private void setSnooze(int m) {
        snoozeMin = Math.max(5, Math.min(120, m));
        snoozeBtn.setText("Aplazar " + snoozeMin + " min");
    }

    @Override
    public void onBackPressed() { finish(); }
}
