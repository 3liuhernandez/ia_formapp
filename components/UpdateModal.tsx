// components/UpdateModal.tsx
import { useAppUpdate } from '@/context/UpdateContext';
import React from 'react';
import { ActivityIndicator, Button, Modal, StyleSheet, Text, View } from 'react-native';

export function UpdateModal() {
  const {
    isChecking,
    updateInfo,
    isDownloading,
    downloadProgress,
    checkForUpdate,
    downloadAndInstall,
  } = useAppUpdate();

  // console.log('[UpdateModal] render | updateInfo:', updateInfo);

  // El modal solo se muestra si hay una actualización disponible
  if (!updateInfo) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={!!updateInfo}
      onRequestClose={() => { /* Opcional: permitir cerrar */ }}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>¡Nueva versión disponible!</Text>
          <Text style={styles.versionText}>
            Versión {updateInfo.versionName} (Código {updateInfo.versionCode})
          </Text>
          
          {updateInfo.releaseNotes && (
            <Text style={styles.releaseNotes}>{updateInfo.releaseNotes}</Text>
          )}

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Descargando... {Math.round(downloadProgress * 100)}%
              </Text>
              <ActivityIndicator size="small" />
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <Button title="Actualizar ahora" onPress={downloadAndInstall} />
              {/* Opcional: Botón para cancelar */}
              <Button title="Más tarde" onPress={() => { /* Lógica para cerrar */ }} color="#999" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  versionText: { fontSize: 16, color: '#555', marginBottom: 16 },
  releaseNotes: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  progressContainer: { alignItems: 'center', marginVertical: 20 },
  progressText: { marginBottom: 8, fontSize: 16 },
  buttonContainer: { width: '100%', gap: 12 },
});