// hooks/useAppUpdate.ts
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';
import { useState } from 'react';
import { Platform } from 'react-native';

const UPDATE_MANIFEST_URL = 'https://app-distribution-server.nextstepinternacional.com/apps/mi-app-rn/android/stable/apk/version.json';

export interface UpdateInfo {
  versionCode: number;
  versionName: string;
  url: string;
  releaseNotes?: string;
}

export function useAppUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const checkForUpdate = async () => {
    // Solo aplicamos la lógica en Android
    if (Platform.OS !== 'android') return;

    setIsChecking(true);
    try {
      const response = await fetch(UPDATE_MANIFEST_URL);
      if (!response.ok) throw new Error('No se pudo obtener el manifiesto de actualización.');

      const manifest: UpdateInfo = await response.json();

      // Obtenemos el versionCode instalado. En Android, nativeBuildVersion es el versionCode.
      const currentVersionCode = Application.nativeBuildVersion
        ? parseInt(Application.nativeBuildVersion, 10)
        : 0;

      // Si la versión del servidor es mayor, hay una actualización disponible
      if (manifest.versionCode > currentVersionCode) {
        setUpdateInfo(manifest);
      } else {
        setUpdateInfo(null);
      }
    } catch (error) {
      console.error('Error al buscar actualizaciones:', error);
      // Opcional: podrías querer mostrar un mensaje al usuario aquí
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (!updateInfo) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    const apkUri = `${FileSystem.cacheDirectory}update.apk`;

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        updateInfo.url,
        apkUri,
        {},
        (p) => setDownloadProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite)
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('La descarga del APK falló.');

      // Import dinámico: solo se resuelve cuando el usuario pulsa "Actualizar"
      const ApkInstaller = await import('expo-apk-installer');
      await ApkInstaller.install(result.uri);
    } catch (error) {
      console.error('Error durante la descarga o instalación:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    isChecking,
    updateInfo,
    isDownloading,
    downloadProgress,
    checkForUpdate,
    downloadAndInstall,
  };
}