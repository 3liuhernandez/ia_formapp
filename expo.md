# Instalar EAS CLI
npm install -g eas-cli

# Login (necesitas cuenta gratuita en expo.dev)
eas login

# Configurar
eas build:configure

# Generar APK
eas build --platform android --profile preview
