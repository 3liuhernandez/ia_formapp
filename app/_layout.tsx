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
startNetworkMonitor();
registerBackgroundSync().catch(console.error);

// Auto-sync when connection is restored
addNetworkListener((isConnected) => {
  if (isConnected) {
    console.log('[App] Conexión detectada, iniciando sincronización...');
    syncPendingRecords().catch(console.error);
  }
});

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Cargando...</Text>
    </View>
  );
}

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const db = useSQLiteContext();
  const [hasProfile, setHasProfile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    async function checkProfile() {
      try {
        const profile = await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
        setHasProfile(!!profile);
      } catch (e) {
        setHasProfile(false);
      }
    }
    checkProfile();
  }, []);

  if (isLoading || hasProfile === null) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {!hasProfile ? (
          <Stack.Screen name="register" />
        ) : user ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="login" />
        )}
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider
        databaseName="app.db"
        onInit={initializeDatabase}
        useSuspense={true}
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
