// context/UpdateContext.tsx
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Platform } from 'react-native';

const UPDATE_MANIFEST_URL = 'https://app-distribution-server.nextstepinternacional.com/apps/elimapp-iglc/android/stable/apk/latest.json';

export interface UpdateInfo {
    versionCode: number;
    versionName: string;
    url: string;
    releaseNotes?: string;
}

interface UpdateContextType {
    isChecking: boolean;
    updateInfo: UpdateInfo | null;
    isDownloading: boolean;
    downloadProgress: number;
    checkForUpdate: () => Promise<void>;
    downloadAndInstall: () => Promise<void>;
    dismissUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextType | null>(null);

export function UpdateProvider({ children }: { children: React.ReactNode }) {
    const [isChecking, setIsChecking] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const checkForUpdate = useCallback(async () => {
        if (Platform.OS !== 'android') return;
        setIsChecking(true);
        try {
            const response = await fetch(UPDATE_MANIFEST_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const manifest: UpdateInfo = await response.json();

            const currentVersionCode = Application.nativeBuildVersion
                ? parseInt(Application.nativeBuildVersion, 10)
                : 0;

            if (manifest.versionCode > currentVersionCode) {
                console.log('[Update] Manifest:', manifest, '| Instalado:', currentVersionCode);
                setUpdateInfo(manifest);
            } else {
                setUpdateInfo(null);
            }
        } catch (error) {
            console.error('[Update] Error al buscar actualizaciones:', error);
        } finally {
            setIsChecking(false);
        }
    }, []);

    const downloadAndInstall = useCallback(async () => {
        if (!updateInfo) return;
        setIsDownloading(true);
        setDownloadProgress(0);
        const apkUri = `${FileSystem.cacheDirectory}update.apk`;
        console.log('apkUri', apkUri)
        try {
            const downloadResumable = FileSystem.createDownloadResumable(
                updateInfo.url,
                apkUri,
                {},
                (p) =>
                    setDownloadProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite)
            );
            const result = await downloadResumable.downloadAsync();
            if (!result?.uri) throw new Error('Descarga fallida');
            const ApkInstaller = await import('expo-apk-installer');
            await ApkInstaller.install(result.uri);
        } catch (error) {
            console.error('[Update] Error al descargar/instalar:', error);
        } finally {
            setIsDownloading(false);
        }
    }, [updateInfo]);

    const dismissUpdate = useCallback(() => setUpdateInfo(null), []);

    return (
        <UpdateContext.Provider
            value={{
                isChecking,
                updateInfo,
                isDownloading,
                downloadProgress,
                checkForUpdate,
                downloadAndInstall,
                dismissUpdate,
            }}
        >
            {children}
        </UpdateContext.Provider>
    );
}

export function useAppUpdate() {
    const ctx = useContext(UpdateContext);
    if (!ctx) throw new Error('useAppUpdate debe usarse dentro de <UpdateProvider>');
    return ctx;
}