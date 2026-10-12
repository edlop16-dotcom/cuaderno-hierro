# Agrega las alarmas de hábitos a pantalla completa al proyecto Android generado por Capacitor.
import glob, os, re, shutil

main = glob.glob('android/app/src/main/java/**/MainActivity.java', recursive=True)
assert main, 'MainActivity.java no encontrado'
pkg_dir = os.path.dirname(main[0])
for f in glob.glob('ci/native/*.java'):
    shutil.copy(f, pkg_dir)

s = open(main[0]).read()
if 'HabitAlarmPlugin' not in s:
    s = re.sub(r'public class MainActivity extends BridgeActivity \{\s*\}',
               '''public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(HabitAlarmPlugin.class);
        registerPlugin(BodySensorsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}''', s)
assert 'registerPlugin(BodySensorsPlugin.class)' in s, s
open(main[0], 'w').write(s)

p = 'android/app/src/main/AndroidManifest.xml'
m = open(p).read()
comp = '''
        <activity
            android:name=".HabitAlarmActivity"
            android:exported="false"
            android:excludeFromRecents="true"
            android:launchMode="singleInstance"
            android:taskAffinity=""
            android:theme="@android:style/Theme.DeviceDefault.NoActionBar" />
        <receiver
            android:name=".HabitAlarmReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
    </application>'''
perms = '''
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.BODY_SENSORS" />
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
    <uses-feature android:name="android.hardware.sensor.heartrate" android:required="false" />
    <uses-feature android:name="android.hardware.sensor.stepcounter" android:required="false" />
</manifest>'''
if 'HabitAlarmActivity' not in m:
    m = m.replace('</application>', comp.lstrip('\n'), 1)
    m = m.replace('</manifest>', perms.lstrip('\n'), 1)
assert 'HabitAlarmActivity' in m and 'USE_FULL_SCREEN_INTENT' in m
open(p, 'w').write(m)
print('alarmas de hábitos agregadas en', pkg_dir)
