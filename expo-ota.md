Para activar **Expo Updates** (OTA, Over-The-Air) en tu proyecto con Expo SDK 54, debes instalar la librería, configurar la URL de actualizaciones, definir un `runtimeVersion` y asegurarte de que los perfiles de EAS Build tengan los canales correctos. A continuación, te explico paso a paso cómo hacerlo.

---

### 1. Instalar `expo-updates`

Ejecuta el siguiente comando para instalar la versión compatible con tu SDK:

```bash
npx expo install expo-updates
```

Esto añadirá la dependencia a tu `package.json`.

---

### 2. Configurar `app.json` (o `app.config.js`)

Necesitas agregar dos propiedades clave dentro de la sección `expo`:

- **`updates.url`**: la URL del servicio de actualizaciones (EAS Update la genera automáticamente).
- **`runtimeVersion`**: identifica la versión nativa de tu app. Puedes usar una política como `"sdkVersion"` para que se actualice automáticamente con el SDK.

Puedes hacerlo manualmente o ejecutando el comando de configuración de EAS Update:

```bash
eas update:configure
```

Este comando añade automáticamente los campos `updates.url` y `runtimeVersion` a tu `app.json`.

Si prefieres hacerlo manualmente, tu `app.json` debería quedar similar a esto:

```json
{
  "expo": {
    "name": "elimapp",
    "slug": "elimapp",
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    }
    // ... resto de tu configuración
  }
}
```

> **Nota**: La política `"sdkVersion"` es la más sencilla para empezar. Si más adelante necesitas un control más fino (por ejemplo, cuando cambias librerías nativas), puedes usar `"appVersion"` o `"fingerprint"`.

---

### 3. Configurar `eas.json` con canales

Cada perfil de compilación debe tener un **canal** (`channel`) para que las actualizaciones se publiquen en el entorno correcto (desarrollo, preview, producción). Añade la propiedad `channel` a cada perfil:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "android": {
        "buildType": "apk"
      }
      // ... env
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      }
      // ... env
    },
    "production": {
      "autoIncrement": true,
      "channel": "production"
      // ... env
    }
  }
}
```

Los canales permiten que, por ejemplo, una actualización publicada con `--channel production` solo llegue a las apps instaladas desde la compilación de producción.

---

### 4. Generar una nueva compilación (build)

**Importante**: `expo-updates` es una librería nativa. No funcionará en un build existente; necesitas crear una **nueva compilación** con EAS Build para que la librería quede incluida en el binario.

```bash
# Para producción (AAB/APK)
eas build --profile production --platform android

# Para preview (APK de prueba)
eas build --profile preview --platform android
```

Una vez instalada la nueva build en los dispositivos, las actualizaciones OTA podrán descargarse.

> **Nota**: Las actualizaciones con `runtimeVersion` no se pueden probar en **Expo Go**. Necesitas una **development build** o una build de preview/producción para probar el flujo real.

---

### 5. Publicar una actualización OTA

Cuando quieras enviar cambios de JavaScript/TypeScript sin pasar por las tiendas, ejecuta:

```bash
eas update --channel production --message "mejora UI"
```

Esto publicará el bundle en el canal `production`. Las apps que tengan esa build (con el mismo `runtimeVersion` y canal) descargarán la actualización la próxima vez que se abran o cuando se ejecute una comprobación manual.

---

### 6. (Opcional) Controlar las actualizaciones desde el código

Por defecto, `expo-updates` comprueba si hay actualizaciones al iniciar la app. Si quieres **forzar una comprobación manual** o mostrar una UI de "Actualizando...", puedes usar la API de `expo-updates`.

#### Ejemplo con `checkForUpdateAsync` (API clásica)

```javascript
import * as Updates from "expo-updates";
import { Button, View } from "react-native";

function App() {
  async function onFetchUpdateAsync() {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        // Recarga la app para aplicar la actualización
        await Updates.reloadAsync();
      }
    } catch (error) {
      alert(`Error al buscar actualización: ${error}`);
    }
  }

  return (
    <View>
      <Button title="Buscar actualización" onPress={onFetchUpdateAsync} />
    </View>
  );
}
```

Este patrón es útil si quieres que el usuario decida cuándo actualizar.

#### Ejemplo con el hook `useUpdates()` (más moderno)

Si prefieres un enfoque declarativo, puedes usar el hook `useUpdates()` que expone el estado de la comprobación y descarga:

```javascript
import { useUpdates } from 'expo-updates';
import { Button, Text, View } from 'react-native';

function App() {
  const { isChecking, isDownloading, isUpdateAvailable, ... } = useUpdates();

  return (
    <View>
      <Text>{isChecking ? 'Comprobando...' : 'Listo'}</Text>
      {isUpdateAvailable && <Text>Actualización disponible</Text>}
    </View>
  );
}
```

El hook se actualiza automáticamente cuando llamas a `checkForUpdateAsync()` o `fetchUpdateAsync()`.

---

### Resumen de pasos

| Paso | Acción                                                                                    |
| ---- | ----------------------------------------------------------------------------------------- |
| 1    | `npx expo install expo-updates`                                                           |
| 2    | Añadir `updates.url` y `runtimeVersion` en `app.json` (o ejecutar `eas update:configure`) |
| 3    | Añadir `"channel"` a cada perfil en `eas.json`                                            |
| 4    | Crear una **nueva build** con EAS Build                                                   |
| 5    | Publicar actualizaciones con `eas update --channel <nombre>`                              |
| 6    | (Opcional) Usar `Updates.checkForUpdateAsync()` o `useUpdates()` para control manual      |

Con esto, tu app `elimapp` quedará lista para recibir actualizaciones OTA sin necesidad de volver a publicar en las tiendas.
