#!/usr/bin/env bash
set -euo pipefail
npm install --no-audit --no-fund
mkdir -p www/fonts
for w in 500 600 700 800; do cp "node_modules/@fontsource/poppins/files/poppins-latin-$w-normal.woff2" www/fonts/; done
for w in 400 500 600 700 800; do cp "node_modules/@fontsource/inter/files/inter-latin-$w-normal.woff2" www/fonts/; done
pip install --quiet pillow
python3 ci/icons.py
npx cap add android
npx capacitor-assets generate --android --iconBackgroundColor '#0b0d12' --iconBackgroundColorDark '#0b0d12' --splashBackgroundColor '#0b0d12' --splashBackgroundColorDark '#0b0d12'
cp ci/ic_stat_notify.xml android/app/src/main/res/drawable/
cp ci/cuaderno.keystore android/app/
python3 ci/patch_gradle.py
npx cap sync android
cd android && chmod +x gradlew && ./gradlew assembleRelease --no-daemon
cp app/build/outputs/apk/release/app-release.apk ../CuadernoDeHierro.apk
