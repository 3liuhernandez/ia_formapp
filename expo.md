# Instalar EAS CLI
npm install -g eas-cli

# Login (necesitas cuenta gratuita en expo.dev)
eas login

# Configurar
eas build:configure

# Generar APK
eas build --platform android --profile preview

# Para generar un APK de prueba (recomendado para ver resultados rápido):
- npx expo prebuild --platform android
- cd android
- ./gradlew assembleRelease
- ./gradlew bundleRelease

- Ubicación del archivo:
Una vez termine, encontrarás tu app en:
android/app/build/outputs/apk/release/app-release.apk

--- 

- Limpieza: Si haces cambios y el build falla, prueba limpiar la caché antes de reintentar:
PowerShell
./gradlew clean

1. Limpieza "Manual" (Fuerza bruta)
Como gradlew clean falla, vamos a borrar lo que él no puede. Ejecuta estos comandos en tu terminal (en la raíz del proyecto):

# Borra las carpetas de compilación de Android
Remove-Item -Recurse -Force android/app/build
Remove-Item -Recurse -Force android/build

# Borra la caché de C++ (ESTO ES LO MÁS IMPORTANTE)
Remove-Item -Recurse -Force android/app/.cxx

2. Regenerar los archivos de enlace (Autolinking)
npx expo prebuild --platform android

3. Reintentar el Build
cd android
./gradlew assembleRelease

---

eas build --platform android --profile preview --local

# Para generar el paquete de producción (.aab) para la tienda:
eas build --platform android --profile production --local





# 1. Asegúrate de estar en la carpeta 'ia/stg'
cd c:/www/formApp/ia/stg

# 2. Limpia los archivos temporales de Android
cd android; ./gradlew clean; cd ..

# 3. Genera el nuevo build local con las correcciones
eas build --platform android --profile preview --local
