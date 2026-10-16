package pe.edgwr.cuadernohierro;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import org.json.JSONObject;

public class HabitAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (a == null) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) { HabitAlarms.rearm(c); StepStore.armNightly(c); return; }
        if (StepStore.A_SNAP.equals(a)) {
            final PendingResult pr = goAsync();
            StepStore.read(c, steps -> { StepStore.armNightly(c); pr.finish(); });
            return;
        }
        JSONObject o;
        try { o = new JSONObject(i.getStringExtra("item")); } catch (Exception e) { return; }
        if (HabitAlarms.A_FIRE.equals(a)) {   // goAsync mantiene vivo el proceso mientras suena el ding dong
            final PendingResult pr = goAsync();
            HabitAlarms.show(c, o);
            new Handler(Looper.getMainLooper()).postDelayed(pr::finish, 3200);
        }
        else if (HabitAlarms.A_DONE.equals(a)) { HabitAlarms.done(c, o); Toast.makeText(c, "¡Hecho! " + o.optString("name"), Toast.LENGTH_SHORT).show(); }
        else if (HabitAlarms.A_DISMISS.equals(a)) { HabitAlarms.again(c, o); }
        else if (HabitAlarms.A_SNOOZE.equals(a)) { HabitAlarms.snooze(c, o, 15); Toast.makeText(c, "Te lo recuerdo en 15 min", Toast.LENGTH_SHORT).show(); }
    }
}
