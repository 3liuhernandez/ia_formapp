import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  const latestVersion = 1;
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = version?.user_version ?? 0;

  console.log(`[DB] Version actual: ${currentVersion} | latestVersion: ${latestVersion}`);
  if (currentVersion >= latestVersion) return;

  console.log(`[DB] Inicializando base de datos (v${currentVersion} -> v${latestVersion})...`);

  try {

    // Solo para dev: borra todas las tablas y vuelve a inicializar
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS people;
      DROP TABLE IF EXISTS user;
      DROP TABLE IF EXISTS profile;
      PRAGMA user_version = 0;
      PRAGMA foreign_keys = ON;
    `);

    await db.execAsync(`
      PRAGMA journal_mode = 'delete';
      PRAGMA foreign_keys = ON;

      -- ────────────────────────────────────────────────────────
      -- PROFILE (datos personales / dispositivo del usuario)
      -- ────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS profile (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        dni           INTEGER UNIQUE,
        name          TEXT NOT NULL,
        last_name     TEXT NOT NULL,
        phone         TEXT NOT NULL,
        email         TEXT DEFAULT '',
        gender        TEXT DEFAULT 'M',
        brand         TEXT DEFAULT '',
        model         TEXT DEFAULT '',
        os_version    TEXT DEFAULT '',
        device_id     TEXT DEFAULT '',
        synced        INTEGER DEFAULT 0
      );

      -- ────────────────────────────────────────────────────────
      -- USER (autenticación)
      -- ────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS user (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        password      TEXT NOT NULL,
        name          TEXT NOT NULL,
        role_id       INTEGER NOT NULL DEFAULT 1,
        role_name     TEXT NOT NULL DEFAULT 'register'
                        CHECK (role_name IN ('register','admin')),
        profile_dni   INTEGER,
        token         TEXT,
        expires_at    TEXT,
        created_at    TEXT DEFAULT (datetime('now','localtime')),
        updated_at    TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (profile_dni) REFERENCES profile(dni) ON DELETE SET NULL
      );

      -- ────────────────────────────────────────────────────────
      -- PEOPLE (personas registradas)
      -- ────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS people (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        dni                INTEGER NOT NULL,
        name               TEXT NOT NULL,
        last_name          TEXT NOT NULL DEFAULT '',
        phone              TEXT NOT NULL,
        phone_optional     TEXT DEFAULT '',
        email              TEXT DEFAULT '',
        address            TEXT DEFAULT '',
        parish             TEXT DEFAULT '',
        address_reference  TEXT DEFAULT '',
        gender             TEXT DEFAULT 'M',
        birthday_date      TEXT DEFAULT '',
        comments           TEXT DEFAULT '',
        visit_day          TEXT DEFAULT '',
        visit_time         TEXT DEFAULT '',
        registrant_dni     INTEGER,
        synced             INTEGER DEFAULT 0,
        created_at         TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (registrant_dni) REFERENCES profile(dni) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_people_dni            ON people(dni);
      CREATE INDEX IF NOT EXISTS idx_people_registrant_dni ON people(registrant_dni);
      CREATE INDEX IF NOT EXISTS idx_people_synced         ON people(synced);

      -- ────────────────────────────────────────────────────────
      -- Usuario admin por defecto
      -- ────────────────────────────────────────────────────────
      INSERT OR REPLACE INTO user (username, password, name, role_name, profile_dni)
      VALUES ('admin', 'admin123', 'Servidor', 'admin', 1);

      PRAGMA user_version = ${latestVersion};
    `);

    console.log(`[DB] Inicialización completada exitosamente v${latestVersion}`);
  } catch (error) {
    console.error('[DB] CRITICAL: Falló la inicialización:', error);
    throw error;
  }
}