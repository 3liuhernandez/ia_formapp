import type { SQLiteDatabase } from 'expo-sqlite';

export type Profile = {
  id: number;
  dni: string | null;
  name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  brand: string;
  model: string;
  os_version: string;
  device_id: string;
  synced: number;
};

// Lo que se pasa al crear/actualizar (sin id, sin synced)
export type ProfileInput = Omit<Profile, 'id' | 'synced'>;

export const profileRepo = {
  /** Devuelve el perfil único del dispositivo (o null si no existe). */
  async get(db: SQLiteDatabase): Promise<Profile | null> {
    return db.getFirstAsync<Profile>('SELECT * FROM profile LIMIT 1');
  },

  /** Devuelve true si ya existe un perfil (equivale a hasProfile). */
  async hasAny(db: SQLiteDatabase): Promise<boolean> {
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) as n FROM profile'
    );
    return (row?.n ?? 0) > 0;
  },

  async getById(db: SQLiteDatabase, id: number): Promise<Profile | null> {
    return db.getFirstAsync<Profile>('SELECT * FROM profile WHERE id = ?', [id]);
  },

  async getByDni(db: SQLiteDatabase, dni: string): Promise<Profile | null> {
    return db.getFirstAsync<Profile>('SELECT * FROM profile WHERE dni = ?', [dni]);
  },

  /**
   * Crea o actualiza el perfil único del dispositivo.
   * Si ya existe uno, hace UPDATE; si no, hace INSERT.
   * Devuelve el id resultante.
   */
  async upsert(db: SQLiteDatabase, p: ProfileInput): Promise<number> {
    const existing = await profileRepo.get(db);
    if (existing) {
      await profileRepo.update(db, existing.id, p);
      return existing.id;
    }
    const result = await db.runAsync(
      `INSERT INTO profile
        (dni, name, last_name, phone, email, gender,
         brand, model, os_version, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.dni, p.name, p.last_name, p.phone, p.email, p.gender,
        p.brand, p.model, p.os_version, p.device_id,
      ]
    );
    return result.lastInsertRowId;
  },

  async update(db: SQLiteDatabase, id: number, p: Partial<ProfileInput>): Promise<void> {
    const fields = Object.entries(p).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return;
    const set = fields.map(([k]) => `${k} = ?`).join(', ');
    const values = fields.map(([, v]) => v as string | number | null);
    await db.runAsync(
      `UPDATE profile SET ${set}, synced = 0 WHERE id = ?`,
      [...values, id]
    );
  },

  async markSynced(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('UPDATE profile SET synced = 1 WHERE id = ?', [id]);
  },

  async delete(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM profile WHERE id = ?', [id]);
  },
};