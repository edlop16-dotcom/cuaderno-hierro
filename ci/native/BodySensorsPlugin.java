package pe.edgwr.cuadernohierro;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Pulso (sensor del reloj) y pasos del día (celular y reloj). */
@CapacitorPlugin(name = "BodySensors", permissions = {
    @Permission(alias = "body", strings = { Manifest.permission.BODY_SENSORS }),
    @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
})
public class BodySensorsPlugin extends Plugin {
    private SensorEventListener hrL;

    private SensorManager sm() { return (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE); }
    private boolean granted(String p) { return ContextCompat.checkSelfPermission(getContext(), p) == PackageManager.PERMISSION_GRANTED; }
    private boolean hrOk() { return granted(Manifest.permission.BODY_SENSORS); }
    private boolean stepsOk() { return Build.VERSION.SDK_INT < 29 || granted(Manifest.permission.ACTIVITY_RECOGNITION); }

    private JSObject info() {
        SensorManager sm = sm();
        JSObject r = new JSObject();
        r.put("hr", sm != null && sm.getDefaultSensor(Sensor.TYPE_HEART_RATE) != null);
        r.put("steps", StepStore.has(getContext()));
        r.put("hrPerm", hrOk());
        r.put("stepsPerm", stepsOk());
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("model", Build.MANUFACTURER + " " + Build.MODEL);
        return r;
    }

    @PluginMethod
    public void info(PluginCall call) { call.resolve(info()); }

    @PluginMethod
    public void request(PluginCall call) {
        String w = call.getString("what", "steps");
        if ("hr".equals(w)) { if (hrOk()) call.resolve(info()); else requestPermissionForAlias("body", call, "permCb"); }
        else { if (stepsOk()) call.resolve(info()); else requestPermissionForAlias("activity", call, "permCb"); }
    }

    @PermissionCallback
    private void permCb(PluginCall call) { call.resolve(info()); }

    @PluginMethod
    public void steps(PluginCall call) {
        if (!stepsOk()) { JSObject r = new JSObject(); r.put("today", -1); call.resolve(r); return; }
        StepStore.armNightly(getContext());
        StepStore.read(getContext(), n -> { JSObject r = new JSObject(); r.put("today", n); call.resolve(r); });
    }

    @PluginMethod
    public void startHr(PluginCall call) {
        SensorManager sm = sm();
        Sensor s = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_HEART_RATE);
        if (s == null || !hrOk()) { call.reject("sin sensor o sin permiso"); return; }
        if (hrL == null) {
            hrL = new SensorEventListener() {
                @Override public void onSensorChanged(SensorEvent e) {
                    if (e.values == null || e.values.length == 0) return;
                    int bpm = Math.round(e.values[0]);
                    if (bpm < 30 || bpm > 230) return;
                    if (e.accuracy == SensorManager.SENSOR_STATUS_UNRELIABLE || e.accuracy == -1) return;
                    JSObject d = new JSObject(); d.put("bpm", bpm); d.put("acc", e.accuracy); d.put("at", System.currentTimeMillis());
                    notifyListeners("hr", d);
                }
                @Override public void onAccuracyChanged(Sensor sensor, int a) {}
            };
            try { sm.registerListener(hrL, s, SensorManager.SENSOR_DELAY_NORMAL); }
            catch (SecurityException ex) { hrL = null; call.reject("sin permiso"); return; }
        }
        call.resolve();
    }

    @PluginMethod
    public void stopHr(PluginCall call) {
        SensorManager sm = sm();
        if (hrL != null && sm != null) sm.unregisterListener(hrL);
        hrL = null;
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() { SensorManager sm = sm(); if (hrL != null && sm != null) sm.unregisterListener(hrL); hrL = null; }
}
