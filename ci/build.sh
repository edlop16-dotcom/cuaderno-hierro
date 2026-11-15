#!/usr/bin/env bash
set -euo pipefail
# Firma: el keystore no está en el repo. Llega desde los Secrets de GitHub (Settings → Secrets and variables → Actions).
: "${ANDROID_KEYSTORE_BASE64:?Falta el Secret ANDROID_KEYSTORE_BASE64 (el archivo del keystore en base64)}"
: "${ANDROID_KEYSTORE_PASSWORD:?Falta el Secret ANDROID_KEYSTORE_PASSWORD (la contraseña del keystore)}"
npm install --no-audit --no-fund
mkdir -p www/fonts
for w in 500 600 700 800; do cp "node_modules/@fontsource/poppins/files/poppins-latin-$w-normal.woff2" www/fonts/; done
for w in 400 500 600 700 800; do cp "node_modules/@fontsource/inter/files/inter-latin-$w-normal.woff2" www/fonts/; done
for w in 400 500 600 700; do cp "node_modules/@fontsource/barlow/files/barlow-latin-$w-normal.woff2" www/fonts/; done
for w in 500 600 700 800; do cp "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-$w-normal.woff2" www/fonts/; done
# Compatibilidad con WebView antiguos (reloj): baja la sintaxis JS y resuelve CSS moderno
node ci/legacy.mjs www
pip install --quiet pillow
mkdir -p assets && cp ci/assets/*.png assets/
npx cap add android
npx capacitor-assets generate --android --iconBackgroundColor '#12151d' --iconBackgroundColorDark '#12151d' --splashBackgroundColor '#0b0d12' --splashBackgroundColorDark '#0b0d12'
cp ci/ic_stat_notify.xml android/app/src/main/res/drawable/
printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode --ignore-garbage > android/app/forja-release.keystore
keytool -list -keystore android/app/forja-release.keystore -storepass:env ANDROID_KEYSTORE_PASSWORD -alias forja > /dev/null 2>&1 || { echo "El keystore de los Secrets no abre con esa contraseña o no tiene el alias forja"; exit 1; }
python3 ci/patch_gradle.py
python3 ci/patch_native.py
python3 ci/patch_store.py
npx cap sync android
cd android && chmod +x gradlew && ./gradlew assembleRelease bundleRelease --no-daemon
cp app/build/outputs/apk/release/app-release.apk ../Forja.apk
cp app/build/outputs/bundle/release/app-release.aab ../Forja.aab
