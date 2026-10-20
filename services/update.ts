import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, Platform } from 'react-native';
import { getApiConfig } from './settings';

export interface UpdateInfo {
    version: string;
    downloadUrl: string;
    releaseNotes?: string;
}

/**
 * Consulta la API para ver si hay una versión más reciente disponible.
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
    try {
        const { apiUrl, apiKey } = await getApiConfig();
        // Limpiamos la URL para asegurar que termine bien
        const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        
        // NOTA: Debes tener este endpoint en tu servidor que devuelva JSON con la versión
        const response = await fetch(`${base}/updates/latest`, {
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('[UpdateService] Sin actualizaciones disponibles o endpoint no encontrado');
            return null;
        }
        
        const responseData = await response.json();
        const currentVersion = Constants.expoConfig?.version || '1.0.0';
        
        // Extraemos el objeto interno 'data' que envía tu servidor
        const updateInfo: UpdateInfo | null = responseData.success ? responseData.data : responseData;
        
        console.log(`[UpdateService] Versión actual: ${currentVersion}, Versión API: ${updateInfo?.version}`);

        if (updateInfo && updateInfo.version && isVersionGreater(updateInfo.version, currentVersion)) {
            return updateInfo;
        }
        
        return null;
    } catch (error) {
        console.error('[UpdateService] Error al buscar actualizaciones:', error);
        return null;
    }
}

/**
 * Función auxiliar para comparar versiones semánticas (ej: 1.1.0 > 1.0.9)
 */
function isVersionGreater(latest: string, current: string): boolean {
    const vLatest = latest.split('.').map(n => parseInt(n, 10) || 0);
    const vCurrent = current.split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(vLatest.length, vCurrent.length); i++) {
        const l = vLatest[i] || 0;
        const c = vCurrent[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

/**
 * Descarga el APK y lanza el instalador de Android.
 */
export async function downloadAndInstallUpdate(url: string, onProgress?: (p: number) => void) {
    if (Platform.OS !== 'android') {
        Alert.alert('No soportado', 'Esta función solo está disponible para Android.');
        return;
    }

    try {
        const filename = 'update.apk';
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        
        console.log(`[UpdateService] Iniciando descarga de: ${url}`);
        
        const downloadResumable = FileSystem.createDownloadResumable(
            url,
            fileUri,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                if (onProgress) onProgress(progress);
                console.log(`[UpdateService] Progreso: ${(progress * 100).toFixed(2)}%`);
            }
        );

        const result = await downloadResumable.downloadAsync();
        
        if (result && result.uri) {
            console.log(`[UpdateService] Descarga completada en: ${result.uri}`);
            
            // Importante: Para Android 7+ se requiere un Content URI
            const contentUri = await FileSystem.getContentUriAsync(result.uri);
            
            await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                type: 'application/vnd.android.package-archive',
            });
        }
    } catch (e: any) {
        console.error('[UpdateService] Error durante la instalación:', e);
        Alert.alert('Error de actualización', `No se pudo instalar la nueva versión: ${e.message}`);
    }
}
