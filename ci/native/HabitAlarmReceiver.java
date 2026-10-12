package pe.edgwr.cuadernohierro;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

import org.json.JSONObject;

public class HabitAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (a == null) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) { HabitAlarms.rearm(c); return; }
        JSONObject o;
        try { o = new JSONObject(i.getStringExtra("item")); } catch (Exception e) { return; }
        if (HabitAlarms.A_FIRE.equals(a)) HabitAlarms.show(c, o);
        else if (HabitAlarms.A_DONE.equals(a)) { HabitAlarms.done(c, o); Toast.makeText(c, "¡Hecho! " + o.optString("name"), Toast.LENGTH_SHORT).show(); }
        else if (HabitAlarms.A_SNOOZE.equals(a)) { HabitAlarms.snooze(c, o, 15); Toast.makeText(c, "Te lo recuerdo en 15 min", Toast.LENGTH_SHORT).show(); }
    }
}
