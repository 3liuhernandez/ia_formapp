import type { SQLiteDatabase } from 'expo-sqlite';

export type Person = {
  id: number;
  dni: string;
  name: string;
  last_name: string;
  phone: string;
  phone_optional: string;
  email: string;
  address: string;
  parish: string;
  address_reference: string;
  gender: string;
  birthday_date: string;
  comments: string;
  visit_day: string;
  visit_time: string;
  registrant_dni: string | null;
  synced: number;
  created_at: string;
};

export type NewPerson = Omit<Person, 'id' | 'synced' | 'created_at'>;

export const peopleRepo = {
  async list(db: SQLiteDatabase): Promise<Person[]> {
    return db.getAllAsync<Person>(
      'SELECT * FROM people ORDER BY created_at DESC'
    );
  },

  async listPendingSync(db: SQLiteDatabase): Promise<Person[]> {
    return db.getAllAsync<Person>(
      'SELECT * FROM people WHERE synced = 0 ORDER BY created_at ASC'
    );
  },

  async getById(db: SQLiteDatabase, id: number): Promise<Person | null> {
    return db.getFirstAsync<Person>('SELECT * FROM people WHERE id = ?', [id]);
  },

  async search(db: SQLiteDatabase, term: string): Promise<Person[]> {
    const like = `%${term}%`;
    return db.getAllAsync<Person>(
      `SELECT * FROM people
       WHERE name LIKE ? OR last_name LIKE ? OR dni LIKE ?
       ORDER BY created_at DESC`,
      [like, like, like]
    );
  },

  async insert(
    db: SQLiteDatabase,
    p: NewPerson
  ): Promise<number> {
    const result = await db.runAsync(
      `INSERT INTO people
        (dni, name, last_name, phone, phone_optional, email, address, parish,
         address_reference, gender, birthday_date, comments,
         visit_day, visit_time, registrant_dni)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.dni, p.name, p.last_name, p.phone, p.phone_optional, p.email,
        p.address, p.parish, p.address_reference, p.gender, p.birthday_date,
        p.comments, p.visit_day, p.visit_time, p.registrant_dni,
      ]
    );
    return result.lastInsertRowId;
  },

  async markSynced(db: SQLiteDatabase, ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE people SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  },

  async count(db: SQLiteDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) as n FROM people'
    );
    return row?.n ?? 0;
  },

  async update(db: SQLiteDatabase, id: number, p: Partial<NewPerson>): Promise<void> {
    const fields = Object.entries(p).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return;
    const set = fields.map(([k]) => `${k} = ?`).join(', ');
    const values = fields.map(([, v]) => v as string | number | null);
    await db.runAsync(
      `UPDATE people SET ${set}, synced = 0 WHERE id = ?`,
      [...values, id]
    );
  },

  async delete(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM people WHERE id = ?', [id]);
  },

};