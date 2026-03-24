import { getUnsyncedPersonas, markAsSynced } from '@/database/operations';
import { initializeDatabase } from '@/database/schema';
import { sendPersonaToApi } from '@/services/api';
import { isOnline } from '@/services/network';
import * as SQLite from 'expo-sqlite';

let isSyncing = false;

async function getInitializedDb(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync('app.db');
    await initializeDatabase(db);
    return db;
}

export async function syncPendingRecords(): Promise<{
    synced: number;
    failed: number;
}> {
    if (isSyncing) {
        console.log('[Sync] Ya hay una sincronización en progreso');
        return { synced: 0, failed: 0 };
    }

    const online = await isOnline();
    if (!online) {
        console.log('[Sync] Sin conexión, sincronización pospuesta');
        return { synced: 0, failed: 0 };
    }

    isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
        const db = await getInitializedDb();
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
    } catch (error) {
        console.error('[Sync] Error general:', error);
    } finally {
        isSyncing = false;
    }

    return { synced: syncedCount, failed: failedCount };
}

export function getIsSyncing(): boolean {
    return isSyncing;
}
