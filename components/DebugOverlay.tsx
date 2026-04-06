// components/DebugOverlay.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { getApiConfig, resetApiConfig } from '@/services/settings';
import { logger } from '@/services/logger';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';

interface DebugOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export function DebugOverlay({ visible, onClose }: DebugOverlayProps) {
  const db = useSQLiteContext();
  const [config, setConfig] = useState<any>(null);
  const [logs, setLogs] = useState(logger.getLogs());

  useEffect(() => {
    if (visible) {
      loadConfig();
      const removeListener = logger.addListener(setLogs);
      return removeListener;
    }
  }, [visible]);

  async function loadConfig() {
    const apiConfig = await getApiConfig();
    setConfig(apiConfig);
  }

  async function handleResetApp() {
    Alert.alert(
      '⚠️ Reiniciar App',
      'Esto borrará la configuración de la API y el token de sesión. La base de datos de personas se mantendrá. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => {
            await resetApiConfig();
            Alert.alert('Éxito', 'Configuración reiniciada. Cierra y abre la app.');
          },
        },
      ]
    );
  }

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode || '1';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Diagnóstico ElimAPP</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* App Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Build Info</Text>
              <InfoRow label="Versión" value={appVersion} />
              <InfoRow label="Build" value={String(buildNumber)} />
              <InfoRow label="Platform" value={Constants.platform?.android ? 'Android' : 'iOS'} />
            </View>

            {/* API Config */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API Config</Text>
              <InfoRow label="URL" value={config?.apiUrl || 'Cargando...'} />
              <InfoRow 
                label="Key" 
                value={config?.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'No configurada'} 
              />
            </View>

            {/* Logs Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Logs (Últimos 100)</Text>
                <TouchableOpacity onPress={() => logger.clearLogs()}>
                  <Text style={styles.clearText}>Limpiar</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.logContainer}>
                {logs.length === 0 ? (
                  <Text style={styles.emptyText}>No hay logs registrados</Text>
                ) : (
                  logs.map((log, i) => (
                    <View key={i} style={styles.logEntry}>
                      <Text style={[styles.logText, log.level === 'error' && styles.errorLog]}>
                        [{log.timestamp}] {log.level.toUpperCase()}: {log.message}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={handleResetApp}>
              <Text style={styles.resetButtonText}>Reiniciar Configuración</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
    backgroundColor: '#f9f9f9',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: 'semibold',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  infoLabel: {
    width: 80,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logContainer: {
    backgroundColor: '#000',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minHeight: 200,
  },
  logEntry: {
    marginBottom: 4,
  },
  logText: {
    fontSize: 11,
    color: '#00ff00',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorLog: {
    color: '#ff0000',
  },
  clearText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
  },
  emptyText: {
    color: '#666',
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: 20,
  },
  resetButton: {
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  resetButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});
