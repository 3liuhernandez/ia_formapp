import { peopleRepo } from '@/database/repositories/people.repository';
import { profileRepo } from '@/database/repositories/profile.repository';
import { sendPersonToApi } from '@/services/api';
import { isOnline } from '@/services/network';
import { getApiConfig } from '@/services/settings';
import * as SQLite from 'expo-sqlite';

let isSyncing = false;

async function getBackgroundDb(): Promise<SQLite.SQLiteDatabase> {
    return SQLite.openDatabaseAsync('app.db');   // ← ✅ mismo que el provider
}

export async function syncPendingRecords(
    dbParam?: SQLite.SQLiteDatabase
): Promise<{ synced: number; failed: number }> {
    if (isSyncing) {
        console.log('[Sync] Ya hay una sincronización en progreso');
        return { synced: 0, failed: 0 };
    }

    const online = await isOnline();
    if (!online) return { synced: 0, failed: 0 };

    isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
        const db = dbParam || (await getBackgroundDb());

        // 1. Sync perfil si está pendiente
        const profile = await profileRepo.get(db);
        if (profile && profile.synced === 0) {
            console.log(`[Sync] Sincronizando perfil de ${profile.dni}...`);
            try {
                const { apiUrl, apiKey } = await getApiConfig();
                const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

                const response = await fetch(`${base}/registrants`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey,
                    },
                    body: JSON.stringify({
                        // mapper profile → español (ajusta según tu backend)
                        cedula: profile.dni,
                        nombres: profile.name,
                        apellidos: profile.last_name,
                        telefono: profile.phone,
                        email: profile.email,
                        sexo: profile.gender,
                        brand: profile.brand,
                        model: profile.model,
                        os_version: profile.os_version,
                        device_id: profile.device_id,
                    }),
                });
                if (response.ok) {
                    await profileRepo.markSynced(db, profile.id);
                    console.log('[Sync] ✓ Perfil sincronizado');
                }
            } catch (err) {
                console.warn('[Sync] ✗ Error sincronizando perfil:', err);
            }
        }

        // 2. Sync personas
        const pending = await peopleRepo.listPendingSync(db);
        if (pending.length === 0) {
            console.log('[Sync] No hay registros pendientes');
            return { synced: 0, failed: 0 };
        }

        console.log(`[Sync] Sincronizando ${pending.length} registros...`);

        for (const person of pending) {
            try {
                const result = await sendPersonToApi(person);
                if (result.success) {
                    await peopleRepo.markSynced(db, [person.id]);
                    syncedCount++;
                    console.log(`[Sync] ✓ Registro #${person.id} sincronizado`);
                } else {
                    failedCount++;
                    console.log(`[Sync] ✗ Registro #${person.id}: ${result.message}`);
                }
            } catch (err) {
                failedCount++;
                console.log(`[Sync] ✗ Error con registro #${person.id}:`, err);
            }
        }

        console.log(`[Sync] Completado: ${syncedCount} ok, ${failedCount} fallidos`);
    } catch (error: any) {
        console.error('[Sync] Error general:', error);
    } finally {
        isSyncing = false;
    }

    return { synced: syncedCount, failed: failedCount };
}

export function getIsSyncing(): boolean {
    return isSyncing;
}
