p = 'android/app/build.gradle'; s = open(p).read()
s = s.replace('versionCode 1\n', 'versionCode Integer.parseInt(System.getenv("BUILD_NUMBER") ?: "1")\n')
s = s.replace('versionName "1.0"', 'versionName "1.0." + (System.getenv("BUILD_NUMBER") ?: "0")')
s = s.replace('    buildTypes {\n        release {\n', """    signingConfigs {
        fixed {
            storeFile file('cuaderno.keystore')
            storePassword 'cuaderno2026'
            keyAlias 'cuaderno'
            keyPassword 'cuaderno2026'
        }
    }
    buildTypes {
        debug { signingConfig signingConfigs.fixed }
        release {
            signingConfig signingConfigs.fixed
""")
assert 'signingConfigs.fixed' in s and 'BUILD_NUMBER' in s
open(p, 'w').write(s)
