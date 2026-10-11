#!/usr/bin/env bash
set -euo pipefail
npm install --no-audit --no-fund
mkdir -p www/fonts
for f in big-shoulders-display/files/big-shoulders-display-latin-700-normal big-shoulders-display/files/big-shoulders-display-latin-800-normal figtree/files/figtree-latin-400-normal figtree/files/figtree-latin-600-normal figtree/files/figtree-latin-700-normal jetbrains-mono/files/jetbrains-mono-latin-500-normal jetbrains-mono/files/jetbrains-mono-latin-700-normal; do
  cp "node_modules/@fontsource/$f.woff2" www/fonts/
done
pip install --quiet pillow
python3 ci/icons.py
npx cap add android
npx capacitor-assets generate --android --iconBackgroundColor '#121519' --iconBackgroundColorDark '#121519' --splashBackgroundColor '#121519' --splashBackgroundColorDark '#121519'
cp ci/ic_stat_notify.xml android/app/src/main/res/drawable/
cp ci/cuaderno.keystore android/app/
python3 ci/patch_gradle.py
npx cap sync android
cd android && chmod +x gradlew && ./gradlew assembleRelease --no-daemon
cp app/build/outputs/apk/release/app-release.apk ../CuadernoDeHierro.apk
