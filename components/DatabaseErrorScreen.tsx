import * as SQLite from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  Alert,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

import { Colors, FontSize } from '@/constants/theme';

type Props = { error: Error; onRetry: () => void };

export function DatabaseErrorScreen({ error, onRetry }: Props) {
  const db = useSQLiteContext();
  const [resetting, setResetting] = useState(false);

  async function handleResetPress() {
    Alert.alert(
      'Restablecer aplicación',
      'Se borrarán TODOS los datos locales. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restablecer', style: 'destructive', onPress: doReset },
      ]
    );
  }

  async function doReset() {
    setResetting(true);
    try {
      await db.closeAsync().catch((e) =>
        console.warn('[DB] closeAsync falló:', e)
      );
      await SQLite.deleteDatabaseAsync('app.db');

      // onRetry cambia el `key` del SQLiteProvider → remonta con DB nueva
      onRetry();
    } catch (e) {
      console.error('[DB] Reset falló:', e);
      Alert.alert(
        'No se pudo restablecer',
        'Cierra y vuelve a abrir la aplicación manualmente.'
      );
      setResetting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>No pudimos preparar la base de datos</Text>
      <Text style={styles.subtitle}>
        Esto puede pasar por falta de espacio, un archivo dañado o una
        actualización incompleta.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={onRetry}
        disabled={resetting}
      >
        <Text style={styles.buttonText}>Reintentar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.dangerButton]}
        onPress={handleResetPress}
        disabled={resetting}
      >
        <Text style={styles.buttonText}>
          {resetting ? 'Restableciendo...' : 'Restablecer aplicación'}
        </Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>Error técnico (solo dev):</Text>
          <Text style={styles.devText}>{error.message}</Text>
          {error.stack && <Text style={styles.devStack}>{error.stack}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  button: {
    backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: 'center',
  },
  dangerButton: { backgroundColor: '#c0392b' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: FontSize.md },
  devBox: {
    marginTop: 24, padding: 12, backgroundColor: '#f3f3f3',
    borderRadius: 6, borderWidth: 1, borderColor: '#ddd',
  },
  devTitle: { fontWeight: '600', marginBottom: 4, color: '#333' },
  devText: { fontFamily: 'monospace', fontSize: 12, color: '#444' },
  devStack: { fontFamily: 'monospace', fontSize: 10, color: '#666', marginTop: 8 },
});