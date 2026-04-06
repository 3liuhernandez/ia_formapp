import { Colors, FontSize } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { initializeDatabase } from '@/database/schema';
import { registerBackgroundSync } from '@/services/backgroundSync';
import { addNetworkListener, startNetworkMonitor } from '@/services/network';
import { syncPendingRecords } from '@/services/sync';
import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Start network monitoring and background sync at app level
// Network monitor start is ok, but listener with sync should be inside provider
startNetworkMonitor();
registerBackgroundSync().catch(console.error);

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Cargando...</Text>
    </View>
  );
}

function RootNavigation() {
  const { user, hasProfile, isLoading } = useAuth();
  const db = useSQLiteContext();

  // Auto-sync when connection is restored, using context DB
  React.useEffect(() => {
    const removeListener = addNetworkListener((isConnected) => {
      if (isConnected && db) {
        console.log('[App] Conexión detectada, sincronizando desde contexto...');
        syncPendingRecords(db).catch(console.error);
      }
    });
    return () => {
      if (typeof removeListener === 'function') removeListener();
    };
  }, [db]);

  if (isLoading || hasProfile === null) {
    return <LoadingScreen />;
  }

  if (hasProfile === false) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="register" />
      </Stack>
    );
  }

  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
      </Stack>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="register" options={{ headerShown: true, title: 'Editar Perfil', presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider
        databaseName="app_v3.db"
        onInit={initializeDatabase}
        useSuspense={false}
      >
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
});
