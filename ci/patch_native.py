# Agrega las alarmas de hábitos a pantalla completa al proyecto Android generado por Capacitor.
import glob, os, re, shutil

main = glob.glob('android/app/src/main/java/**/MainActivity.java', recursive=True)
assert main, 'MainActivity.java no encontrado'
pkg_dir = os.path.dirname(main[0])
for f in glob.glob('ci/native/*.java') + glob.glob('ci/native/*.kt'):
    shutil.copy(f, pkg_dir)

s = open(main[0]).read()
if 'HabitAlarmPlugin' not in s:
    s = re.sub(r'public class MainActivity extends BridgeActivity \{\s*\}',
               '''public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(HabitAlarmPlugin.class);
        registerPlugin(BodySensorsPlugin.class);
        registerPlugin(HealthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}''', s)
assert 'registerPlugin(HealthPlugin.class)' in s, s
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
        <activity-alias
            android:name="ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity=".MainActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>
        <activity-alias
            android:name="HealthRationaleActivity"
            android:exported="true"
            android:targetActivity=".MainActivity">
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity-alias>
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
    <uses-permission android:name="android.permission.health.READ_SLEEP" />
    <uses-permission android:name="android.permission.health.READ_WEIGHT" />
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_RESTING_HEART_RATE" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <uses-sdk tools:overrideLibrary="androidx.health.connect.client" />
    <queries>
        <package android:name="com.google.android.apps.healthdata" />
    </queries>
</manifest>'''
if 'HabitAlarmActivity' not in m:
    m = m.replace('</application>', comp.lstrip('\n'), 1)
    m = m.replace('</manifest>', perms.lstrip('\n'), 1)
if 'xmlns:tools' not in m:
    m = m.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android"', '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"', 1)
assert 'HabitAlarmActivity' in m and 'USE_FULL_SCREEN_INTENT' in m and 'xmlns:tools' in m and 'READ_SLEEP' in m
open(p, 'w').write(m)
print('alarmas de hábitos agregadas en', pkg_dir)

# Kotlin + Health Connect
r = 'android/build.gradle'; g = open(r).read()
if 'kotlin-gradle-plugin' not in g:
    g = g.replace("classpath 'com.android.tools.build:gradle:", "classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'\n        classpath 'com.android.tools.build:gradle:", 1)
assert 'kotlin-gradle-plugin' in g
open(r, 'w').write(g)
a = 'android/app/build.gradle'; g = open(a).read()
if "kotlin-android" not in g:
    g = g.replace("apply plugin: 'com.android.application'", "apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'", 1)
    g = g.replace("android {", "android {\n    kotlinOptions { jvmTarget = '17' }", 1)
    g = g.replace("dependencies {", """dependencies {
    implementation 'androidx.health.connect:connect-client:1.1.0-alpha07'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'""", 1)
assert "kotlin-android" in g and 'connect-client' in g
open(a, 'w').write(g)
print('Health Connect agregado')
