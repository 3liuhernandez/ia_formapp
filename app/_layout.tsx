import { DatabaseErrorScreen } from '@/components/DatabaseErrorScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { initializeDatabase } from '@/database/schema';
import { registerBackgroundSync } from '@/services/backgroundSync';
import { addNetworkListener, startNetworkMonitor } from '@/services/network';
import { syncPendingRecords } from '@/services/sync';
import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense, useCallback, useEffect, useState } from 'react';

import { UpdateModal } from '@/components/UpdateModal';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useFirstLaunch } from '@/hooks/useFirstLaunch';

startNetworkMonitor();
registerBackgroundSync().catch(console.error);


function RootNavigation() {
  const { user, hasProfile, isLoading } = useAuth();
  const db = useSQLiteContext();
  const { checkForUpdate } = useAppUpdate();

  React.useEffect(() => {
    // Verificamos actualizaciones al iniciar la app
    checkForUpdate();

    const remove = addNetworkListener((isConnected) => {
      if (isConnected && db) {
        syncPendingRecords(db).catch(console.error);
      }
    });
    return () => {
      if (typeof remove === 'function') remove();
    };
  }, [db]);

  if (isLoading || hasProfile === null) return <LoadingScreen />;

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
      <StatusBar style="dark" />
      <UpdateModal />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="register"
          options={{ headerShown: true, title: 'Editar Perfil', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

function DatabaseBootstrap({ children }: { children: React.ReactNode }) {
  const [dbError, setDbError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onInit = useCallback(async (db: Parameters<typeof initializeDatabase>[0]) => {
    try {
      await initializeDatabase(db);
      // if (__DEV__) await seedDatabase(db);
    } catch (e) {
      console.error('[DB] onInit falló:', e);
      setDbError(e as Error);   // ← NO rethrow
    }
  }, []);

  const retry = useCallback(() => {
    setDbError(null);
    setAttempt((a) => a + 1);
  }, []);

  return (
    <SQLiteProvider
      key={attempt}
      databaseName="app.db"
      onInit={onInit}
      useSuspense={false}
    >
      {dbError ? (
        <DatabaseErrorScreen error={dbError} onRetry={retry} />
      ) : (
        children
      )}
    </SQLiteProvider>
  );
}

export default function RootLayout() {

  const { isFirstLaunch, isLoading } = useFirstLaunch();

  // Log desde el root, sin tocar DatabaseBootstrap
  useEffect(() => {
    if (!isLoading) console.log('[App] Primera ejecución:', isFirstLaunch);
  }, [isFirstLaunch, isLoading]);

  if (isLoading) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <DatabaseBootstrap>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </DatabaseBootstrap>
    </Suspense>
  );
}