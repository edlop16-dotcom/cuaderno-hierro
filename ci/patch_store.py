# Fase 3 (tienda): Android 16 (API 36), Google Play Billing 8, bordes a borde y permisos que Play acepta.
# Se ejecuta después de patch_native.py. Mantiene minSdk 22 para el reloj.
import glob, re

def sub(path, old, new, must=True, count=1):
    s = open(path).read()
    if old in s:
        s = s.replace(old, new, count)
    elif must and new not in s:
        raise SystemExit(f'No encontré en {path}: {old!r}')
    open(path, 'w').write(s)
    return s

# --- SDK 36 con Capacitor 6 (minSdk 22 sigue igual) ---
v = 'android/variables.gradle'; s = open(v).read()
s = re.sub(r'compileSdkVersion = \d+', 'compileSdkVersion = 36', s)
s = re.sub(r'targetSdkVersion = \d+', 'targetSdkVersion = 36', s)
assert 'compileSdkVersion = 36' in s and 'targetSdkVersion = 36' in s and 'minSdkVersion = 22' in s, s
open(v, 'w').write(s)

b = 'android/build.gradle'; s = open(b).read()
s = re.sub(r"com\.android\.tools\.build:gradle:[\d.]+", 'com.android.tools.build:gradle:8.10.1', s)
s = re.sub(r"kotlin-gradle-plugin:[\d.]+", 'kotlin-gradle-plugin:2.1.21', s)
assert 'gradle:8.10.1' in s and 'kotlin-gradle-plugin:2.1.21' in s
open(b, 'w').write(s)

w = 'android/gradle/wrapper/gradle-wrapper.properties'; s = open(w).read()
s = re.sub(r'distributionUrl=.*', r'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-all.zip', s)
open(w, 'w').write(s)

# --- Google Play Billing 8 ---
a = 'android/app/build.gradle'
sub(a, 'dependencies {', "dependencies {\n    implementation 'com.android.billingclient:billing:8.0.0'")

# --- MainActivity: plugin de compras y bordes a borde (obligatorio desde Android 15 con API 35+) ---
main = glob.glob('android/app/src/main/java/**/MainActivity.java', recursive=True)[0]
sub(main, 'registerPlugin(PhoneSleepPlugin.class);', 'registerPlugin(PhoneSleepPlugin.class);\n        registerPlugin(BillingPlugin.class);')
sub(main, '        super.onCreate(savedInstanceState);\n    }', '''        super.onCreate(savedInstanceState);
        if (android.os.Build.VERSION.SDK_INT >= 35) {
            try {
                android.view.Window w = getWindow();
                androidx.core.view.WindowCompat.setDecorFitsSystemWindows(w, false);
                android.view.View root = findViewById(android.R.id.content);
                root.setBackgroundColor(0xFF0B0D12);
                w.getDecorView().setBackgroundColor(0xFF0B0D12);
                androidx.core.view.WindowInsetsControllerCompat c = new androidx.core.view.WindowInsetsControllerCompat(w, w.getDecorView());
                c.setAppearanceLightStatusBars(false);
                c.setAppearanceLightNavigationBars(false);
                androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
                    androidx.core.graphics.Insets i = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()
                        | androidx.core.view.WindowInsetsCompat.Type.displayCutout()
                        | androidx.core.view.WindowInsetsCompat.Type.ime());
                    view.setPadding(i.left, i.top, i.right, i.bottom);
                    return androidx.core.view.WindowInsetsCompat.CONSUMED;
                });
            } catch (Throwable t) { }
        }
    }''')
s = open(main).read()
assert 'BillingPlugin' in s and 'setOnApplyWindowInsetsListener' in s, s

# --- Permisos: USE_EXACT_ALARM es solo para apps de reloj/calendario; usamos SCHEDULE_EXACT_ALARM (el usuario lo concede) ---
m = 'android/app/src/main/AndroidManifest.xml'; s = open(m).read()
s = s.replace('    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n', '')
s = s.replace('<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />', '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />')
assert 'USE_EXACT_ALARM' not in s and 'SCHEDULE_EXACT_ALARM" />' in s
open(m, 'w').write(s)
print('API 36, Billing 8, bordes a borde y permisos listos')
