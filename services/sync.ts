import { getUnsyncedPersonas, markAsSynced, getUnsyncedProfile, markProfileAsSynced } from '@/database/operations';
import { initializeDatabase } from '@/database/schema';
import { sendPersonaToApi } from '@/services/api';
import { isOnline } from '@/services/network';
import { getApiConfig } from '@/services/settings';
import * as SQLite from 'expo-sqlite';

let isSyncing = false;

async function getBackgroundDb(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync('app_v3.db');
    try { await initializeDatabase(db); } catch (e) {}
    return db;
}

export async function syncPendingRecords(dbParam?: SQLite.SQLiteDatabase): Promise<{
    synced: number;
    failed: number;
}> {
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
        const db = dbParam || await getBackgroundDb();
        // 1. Sync Profile first
        const unsyncedProfile = await getUnsyncedProfile(db);
        if (unsyncedProfile) {
            console.log(`[Sync] Sincronizando perfil de ${unsyncedProfile.cedula}...`);
            try {
                const { apiUrl, apiKey } = await getApiConfig();
                const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

                const response = await fetch(`${base}/registrants`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey,
                    },
                    body: JSON.stringify(unsyncedProfile),
                });
                if (response.ok) {
                    await markProfileAsSynced(db, unsyncedProfile.cedula);
                    console.log('[Sync] ✓ Perfil sincronizado');
                }
            } catch (err) {
                console.warn('[Sync] ✗ Error sincronizando perfil:', err);
            }
        }

        const pending = await getUnsyncedPersonas(db);

        if (pending.length === 0) {
            console.log('[Sync] No hay registros pendientes');
            return { synced: 0, failed: 0 };
        }

        console.log(`[Sync] Sincronizando ${pending.length} registros...`);

        for (const persona of pending) {
            try {
                const result = await sendPersonaToApi({
                    nombre: persona.nombre,
                    cedula: persona.cedula,
                    edad: persona.edad,
                    telefono: persona.telefono,
                    telefono_opcional: persona.telefono_opcional,
                    email: persona.email,
                    direccion: persona.direccion,
                    punto_referencia: persona.punto_referencia,
                    sector_barrio: persona.sector_barrio,
                    fecha_nacimiento: persona.fecha_nacimiento,
                    genero: persona.genero,
                    registrant_id: persona.registrant_id || '',
                });

                if (result.success) {
                    await markAsSynced(db, persona.id);
                    syncedCount++;
                    console.log(`[Sync] ✓ Registro #${persona.id} sincronizado`);
                } else {
                    failedCount++;
                    console.log(`[Sync] ✗ Registro #${persona.id}: ${result.message}`);
                }
            } catch (err) {
                failedCount++;
                console.log(`[Sync] ✗ Error con registro #${persona.id}:`, err);
            }
        }

        console.log(`[Sync] Completado: ${syncedCount} sincronizados, ${failedCount} fallidos`);
    } catch (error: any) {
        console.error('[Sync] Error general:', error);
        // Add more detail for production debugging
        const apiBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        console.error(`[Sync] Configured API: ${apiBase}. Error: ${error.message}`);
    } finally {
        isSyncing = false;
    }

    return { synced: syncedCount, failed: failedCount };
}

export function getIsSyncing(): boolean {
    return isSyncing;
}
