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
    const result = await db.runAsync(
        `INSERT INTO personas (nombre, cedula, edad, telefono, telefono_opcional, email, direccion, punto_referencia, sector_barrio, fecha_nacimiento, genero, synced, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
            persona.nombre,
            persona.cedula,
            persona.edad,
            persona.telefono,
            persona.telefono_opcional,
            persona.email,
            persona.direccion,
            persona.punto_referencia,
            persona.sector_barrio,
            persona.fecha_nacimiento,
            persona.genero,
            userId,
        ]
    );
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
    return { id: user.id, username: user.username, nombre: user.nombre };
}

export async function getUserById(db: SQLiteDatabase, id: number): Promise<User | null> {
    return await db.getFirstAsync<User>(
        'SELECT id, username, nombre FROM users WHERE id = ?',
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
