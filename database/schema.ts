import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  const latestVersion = 6;
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = version?.user_version ?? 0;

  if (currentVersion >= latestVersion) return;

  console.log(`[DB] Inicializando/Actualizando base de datos (v${currentVersion} -> v${latestVersion})...`);

  try {
    await db.execAsync(`
      PRAGMA journal_mode = 'delete';
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        role INTEGER DEFAULT 1,
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
        registrant_id TEXT DEFAULT '',
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
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      );

      INSERT OR IGNORE INTO users (id, username, password_hash, nombre, role) 
      VALUES (1, 'admin', 'admin123', 'Administrador', 1);

      PRAGMA user_version = ${latestVersion};
    `);

    // Migraciones manuales para tablas existentes
    try {
      const usersInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(users)");
      if (!usersInfo.some(c => c.name === 'role')) {
        await db.execAsync("ALTER TABLE users ADD COLUMN role INTEGER DEFAULT 1;");
        await db.execAsync("UPDATE users SET role = 1 WHERE username = 'admin';");
        console.log("[DB] Columna 'role' añadida a users");
      }
    } catch (e) {
      console.error("[DB] Error migrando tabla users:", e);
    }

    console.log("[DB] Inicialización completada exitosamente");
  } catch (error) {
    console.error('[DB] CRITICAL: Falló la inicialización:', error);
    throw error;
  }
}
