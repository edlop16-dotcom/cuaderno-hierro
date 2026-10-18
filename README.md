# Forja

App Android de entrenamiento en español: rutinas, registro de series, progresión, biblioteca de ejercicios, hábitos, recordatorios, exportación a IA y modo reloj.

## Instalar

1. Abre **Releases → versión más reciente → Forja.apk**.
2. Autoriza la instalación desde el navegador si Android lo solicita.
3. Instala encima de la versión anterior para conservar tus datos.

## Desarrollo

Los cambios grandes se trabajan en una rama aparte y pasan a `beta` solo con aprobación explícita. Esta limpieza usa `limpieza`. No compilar, publicar ni subir a `main` sin la instrucción explícita «compila». Todos los commits de esta limpieza usan `[skip ci]` para evitar la compilación automática de beta.

Consulta `CLAUDE.md` para las reglas y arquitectura. Las pruebas usan datos ficticios. Los datos de cada cuenta se leen del almacenamiento local y de su sincronización.

Antes de publicar, configura `LEGAL_OWNER` y `CONTACT_EMAIL` en `www/legal.js`. El correo de ejemplo no es un canal de soporte.
