import type { Persona, PersonaInput, SyncStats, User } from '@/types';
import type { SQLiteDatabase } from 'expo-sqlite';

// ========================
// PERSONAS OPERATIONS
// ========================

export async function insertPersona(
    db: SQLiteDatabase,
    persona: PersonaInput,
    userId: number
): Promise<number> {
    // Reparación de emergencia en caso de que falte la columna por migración fallida
    try {
        const info = await db.getAllAsync<{ name: string }>("PRAGMA table_info(personas)");
        if (!info.some(c => c.name === 'registrant_id')) {
            await db.execAsync("ALTER TABLE personas ADD COLUMN registrant_id TEXT DEFAULT ''");
            console.log("[DB] Columna 'registrant_id' reparada exitosamente");
        }
    } catch (e) { console.error("[DB] Error verificando esquema:", e); }

    const sql = "INSERT INTO personas (nombre, cedula, edad, telefono, telefono_opcional, email, direccion, punto_referencia, sector_barrio, fecha_nacimiento, genero, synced, user_id, registrant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const params = [
        persona.nombre || '',
        persona.cedula || '',
        persona.edad || null,
        persona.telefono || '',
        persona.telefono_opcional || null,
        persona.email || null,
        persona.direccion || null,
        persona.punto_referencia || null,
        persona.sector_barrio || null,
        persona.fecha_nacimiento || null,
        persona.genero || 'M',
        0,
        userId || null,
        persona.registrant_id || null,
    ];

    console.log('[DB] Insert Persona Params:', JSON.stringify(params));
    const result = await db.runAsync(sql, params);
    return result.lastInsertRowId;
}

export async function getAllPersonas(db: SQLiteDatabase): Promise<Persona[]> {
    return await db.getAllAsync<Persona>(
        'SELECT * FROM personas ORDER BY created_at DESC'
    );
}

export async function getPersonasByDateRange(
    db: SQLiteDatabase,
    fromDate: string,
    toDate: string
): Promise<Persona[]> {
    return await db.getAllAsync<Persona>(
        `SELECT * FROM personas
     WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
     ORDER BY created_at DESC`,
        [fromDate, toDate]
    );
}

export async function getUnsyncedPersonas(db: SQLiteDatabase): Promise<Persona[]> {
    return await db.getAllAsync<Persona>(
        'SELECT * FROM personas WHERE synced = 0 ORDER BY created_at ASC'
    );
}

export async function markAsSynced(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('UPDATE personas SET synced = 1 WHERE id = ?', [id]);
}

export async function markMultipleAsSynced(db: SQLiteDatabase, ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
        `UPDATE personas SET synced = 1 WHERE id IN (${placeholders})`,
        ids
    );
}

export async function deletePersona(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM personas WHERE id = ?', [id]);
}

export async function getSyncStats(db: SQLiteDatabase): Promise<SyncStats> {
    const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM personas');
    const synced = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM personas WHERE synced = 1');
    const pending = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM personas WHERE synced = 0');
    return {
        total: total?.count ?? 0,
        synced: synced?.count ?? 0,
        pending: pending?.count ?? 0,
    };
}

export async function searchPersonas(db: SQLiteDatabase, query: string): Promise<Persona[]> {
    const searchTerm = `%${query}%`;
    return await db.getAllAsync<Persona>(
        `SELECT * FROM personas
     WHERE nombre LIKE ? OR cedula LIKE ? OR telefono LIKE ? OR email LIKE ? OR sector_barrio LIKE ?
     ORDER BY created_at DESC`,
        [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );
}

// ========================
// USER OPERATIONS
// ========================

export async function authenticateUser(
    db: SQLiteDatabase,
    username: string,
    password: string
): Promise<User | null> {
    const user = await db.getFirstAsync<User & { password_hash: string }>(
        'SELECT * FROM users WHERE username = ? AND password_hash = ?',
        [username, password]
    );
    if (!user) return null;
    return { id: user.id, username: user.username, nombre: user.nombre, cedula: user.cedula || '', role: user.role };
}

export async function getUserById(db: SQLiteDatabase, id: number): Promise<User | null> {
    return await db.getFirstAsync<User>(
        'SELECT id, username, nombre, cedula, role FROM users WHERE id = ?',
        [id]
    );
}

export async function updateUserPassword(
    db: SQLiteDatabase,
    userId: number,
    newPassword: string
): Promise<void> {
    await db.runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [newPassword, userId]);
}

// ========================
// PROFILE OPERATIONS
// ========================

export async function saveProfile(db: SQLiteDatabase, profile: any): Promise<void> {
    await db.runAsync(
        `INSERT OR REPLACE INTO profile (cedula, nombres, apellidos, telefono, email, sexo, brand, model, os_version, device_id, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            profile.cedula ?? '',
            profile.nombres ?? '',
            profile.apellidos ?? '',
            profile.telefono ?? '',
            profile.email ?? '',
            profile.sexo ?? 'M',
            profile.brand ?? '',
            profile.model ?? '',
            profile.os_version ?? '',
            profile.device_id ?? '',
            profile.synced ?? 0,
        ]
    );
}

export async function getProfile(db: SQLiteDatabase): Promise<any | null> {
    return await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
}

export async function getUnsyncedProfile(db: SQLiteDatabase): Promise<any | null> {
    return await db.getFirstAsync('SELECT * FROM profile WHERE synced = 0 LIMIT 1');
}

export async function markProfileAsSynced(db: SQLiteDatabase, cedula: string): Promise<void> {
    await db.runAsync('UPDATE profile SET synced = 1 WHERE cedula = ?', [cedula]);
}

export async function clearProfile(db: SQLiteDatabase): Promise<void> {
    await db.runAsync('DELETE FROM profile');
}
