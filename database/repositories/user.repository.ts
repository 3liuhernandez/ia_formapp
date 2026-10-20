import type { SQLiteDatabase } from 'expo-sqlite';

export type User = {
  id: number;
  username: string;
  password: string;
  name: string;
  role: 'register' | 'admin';
  profile_id: number | null;
  token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export const userRepo = {
  async findByUsername(db: SQLiteDatabase, username: string): Promise<User | null> {
    return db.getFirstAsync<User>(
      'SELECT * FROM user WHERE username = ?',
      [username]
    );
  },

  async login(
    db: SQLiteDatabase,
    username: string,
    password: string
  ): Promise<User | null> {
    return db.getFirstAsync<User>(
      'SELECT * FROM user WHERE username = ? AND password = ?',
      [username, password]
    );
  },

  async updateToken(
    db: SQLiteDatabase,
    userId: number,
    token: string | null,
    expiresAt: string | null
  ): Promise<void> {
    await db.runAsync(
      `UPDATE user
       SET token = ?, expires_at = ?, updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [token, expiresAt, userId]
    );
  },

    async findById(db: SQLiteDatabase, id: number): Promise<User | null> {
    return db.getFirstAsync<User>('SELECT * FROM user WHERE id = ?', [id]);
  },

  async list(db: SQLiteDatabase): Promise<User[]> {
    return db.getAllAsync<User>('SELECT * FROM user ORDER BY created_at DESC');
  },

  async create(
    db: SQLiteDatabase,
    u: { username: string; password: string; name: string; role?: 'register' | 'admin'; profile_id?: number | null }
  ): Promise<number> {
    const result = await db.runAsync(
      `INSERT INTO user (username, password, name, role, profile_id)
       VALUES (?, ?, ?, ?, ?)`,
      [u.username, u.password, u.name, u.role ?? 'register', u.profile_id ?? null]
    );
    return result.lastInsertRowId;
  },

  async updateRole(
    db: SQLiteDatabase,
    id: number,
    role: 'register' | 'admin'
  ): Promise<void> {
    await db.runAsync(
      `UPDATE user SET role = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [role, id]
    );
  },
};
