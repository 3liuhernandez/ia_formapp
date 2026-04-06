# Instalar EAS CLI
npm install -g eas-cli

# Login (necesitas cuenta gratuita en expo.dev)
eas login

# Configurar
eas build:configure

# Generar APK
eas build --platform android --profile preview

# Para generar un APK de prueba (recomendado para ver resultados rápido):
- npx expo prebuild
- cd android
- ./gradlew assembleRelease
- ./gradlew bundleRelease

- Ubicación del archivo:
Una vez termine, encontrarás tu app en:
android/app/build/outputs/apk/release/app-release.apk

- Limpieza: Si haces cambios y el build falla, prueba limpiar la caché antes de reintentar:
PowerShell
./gradlew clean

eas build --platform android --profile preview --local

# Para generar el paquete de producción (.aab) para la tienda:
eas build --platform android --profile production --local





# 1. Asegúrate de estar en la carpeta 'ia/stg'
cd c:/www/formApp/ia/stg

# 2. Limpia los archivos temporales de Android
cd android; ./gradlew clean; cd ..

# 3. Genera el nuevo build local con las correcciones
eas build --platform android --profile preview --local
