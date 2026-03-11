import { syncPendingRecords } from '@/services/sync';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_SYNC_TASK = 'background-sync-personas';

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
        console.log('[BackgroundSync] Ejecutando tarea de sincronización...');
        const result = await syncPendingRecords();
        console.log(`[BackgroundSync] Resultado: ${result.synced} enviados, ${result.failed} fallidos`);
        return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
        console.error('[BackgroundSync] Error:', error);
        return BackgroundTask.BackgroundTaskResult.Failed;
    }
});

export async function registerBackgroundSync(): Promise<void> {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (!isRegistered) {
            await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
                minimumInterval: 15, // 15 minutes minimum
            });
            console.log('[BackgroundSync] Tarea registrada exitosamente');
        }
    } catch (error) {
        console.error('[BackgroundSync] Error al registrar tarea:', error);
    }
}

export async function unregisterBackgroundSync(): Promise<void> {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (isRegistered) {
            await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
            console.log('[BackgroundSync] Tarea desregistrada');
        }
    } catch (error) {
        console.error('[BackgroundSync] Error al desregistrar:', error);
    }
}
