## 🔄 Caso 1: Actualización OTA (solo JavaScript/assets)

**Cuándo:** Cambios en pantallas, estilos, lógica, textos, o paquetes puramente JS.

### Comando único

```bash
eas update --channel production --message "descripción del cambio" --platform android
```

### Según el entorno

```bash
# Producción (usuarios finales)
eas update --channel production --message "mejora UI" --platform android

# Preview (tu APK de pruebas)
eas update --channel preview --message "prueba" --platform android

# Development (development build)
eas update --channel development --message "dev" --platform android
```

### Verificar

```bash
eas update:list --channel production
```

> 💡 **Tip**: Como solo usas Android, puedes añadir un alias en tu `package.json` para no escribir tanto:
>
> ```json
> "scripts": {
>   "ota:prod": "eas update --channel production --platform android --message",
>   "ota:preview": "eas update --channel preview --platform android --message"
> }
> ```
>
> Y luego lo usas así:
>
> ```bash
> npm run ota:prod -- "mejora UI"
> ```

---

## 📦 Caso 2: Nuevo build de APK

**Cuándo:** Instalaste una librería nativa nueva, cambiaste permisos/iconos/splash/configuración nativa en `app.json`, o cambiaste de SDK.

### Paso 1: incrementar `runtimeVersion` (si aplica)

Si usas `"policy": "sdkVersion"` en tu `app.json`, **no toques nada**. Si usas versión manual, increméntala:

```json
{
  "expo": {
    "runtimeVersion": "1.0.1"
  }
}
```

### Paso 2: generar el build

```bash
# APK instalable para probar en tu teléfono
eas build --profile preview --platform android

# AAB para Google Play
eas build --profile production --platform android

# Development build (para debugging con dev client)
eas build --profile development --platform android
```

### Paso 3: instalar en el teléfono

- **`preview` (`.apk`)**: abre el enlace desde el navegador del móvil → descarga → instala (activando "instalar desde fuentes desconocidas").
- **`production` (`.aab`)**: no es instalable directamente. Solo sirve para subir a Google Play.

---

## 🧠 Regla mental rápida

| ¿Qué cambiaste?                                           | Comando                                              |
| --------------------------------------------------------- | ---------------------------------------------------- |
| Textos, estilos, lógica JS, assets                        | `eas update --channel production --platform android` |
| Paquete puramente JS (`lodash`, `date-fns`, `xlsx`)       | `eas update --channel production --platform android` |
| Paquete nativo nuevo (`expo-camera`, `react-native-maps`) | `eas build --profile preview --platform android`     |
| Permisos, iconos, splash, `app.json` nativo               | `eas build --profile preview --platform android`     |
| Cambio de versión de Expo SDK                             | `eas build --profile preview --platform android`     |

---

## 🚀 Flujo típico Android

1. **Cambio JS** → `eas update --channel production --platform android` → listo, sin reinstalar.
2. **Cambio nativo** → `eas build --profile preview --platform android` → instalas el nuevo `.apk` en tu teléfono.
3. **Para publicar en Play Store** (cuando toque) → `eas build --profile production --platform android` → subes el `.aab` a la consola de Google Play.

Con esto no necesitas pensar en iOS para nada. Todo tu ciclo queda en Android.
