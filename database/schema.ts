import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cedula TEXT NOT NULL,
      edad TEXT DEFAULT '',
      telefono TEXT NOT NULL,
      telefono_opcional TEXT DEFAULT '',
      email TEXT DEFAULT '',
      direccion TEXT DEFAULT '',
      punto_referencia TEXT DEFAULT '',
      sector_barrio TEXT DEFAULT '',
      fecha_nacimiento TEXT DEFAULT '',
      genero TEXT DEFAULT 'M',
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT NOT NULL UNIQUE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT DEFAULT '',
      sexo TEXT DEFAULT 'M',
      brand TEXT DEFAULT '',
      model TEXT DEFAULT '',
      os_version TEXT DEFAULT '',
      device_id TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // Add new columns if upgrading from old schema
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(personas)"
  );
  const columnNames = columns.map(c => c.name);

  const newColumns = [
    { name: 'edad', type: "TEXT DEFAULT ''" },
    { name: 'telefono_opcional', type: "TEXT DEFAULT ''" },
    { name: 'punto_referencia', type: "TEXT DEFAULT ''" },
    { name: 'sector_barrio', type: "TEXT DEFAULT ''" },
    { name: 'registrant_id', type: "TEXT DEFAULT ''" },
  ];

  for (const col of newColumns) {
    if (!columnNames.includes(col.name)) {
      await db.execAsync(`ALTER TABLE personas ADD COLUMN ${col.name} ${col.type}`);
      console.log(`[DB] Columna '${col.name}' agregada`);
    }
  }

  // Create default admin user if none exists
  const userCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  );

  if (userCount && userCount.count === 0) {
    await db.runAsync(
      'INSERT INTO users (username, password_hash, nombre) VALUES (?, ?, ?)',
      ['admin', 'admin123', 'Administrador']
    );
  }
}
