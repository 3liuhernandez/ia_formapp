import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  const latestVersion = 11;
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");

  let currentVersion = version?.user_version ?? 0;

  console.log(`[DB] Version actual: ${currentVersion} | latestVersion: ${latestVersion}`);
  if (currentVersion >= latestVersion) return;

  console.log(`[DB] Inicializando/Actualizando base de datos (v${currentVersion} -> v${latestVersion})...`);

  // script inicial para generar las tablas de la DB
  if (currentVersion === 0) {
    try {

      await db.execAsync(`
        PRAGMA journal_mode = 'delete';
        PRAGMA foreign_keys = ON;

        -- Borrar tablas
        -- DROP TABLE IF EXISTS users;
        -- DROP TABLE IF EXISTS profile;
        -- DROP TABLE IF EXISTS personas;
        -- DROP TABLE IF EXISTS people;
        -- Luego siguen tus CREATE TABLE...

        -- Tabla para guardar los usuarios
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          nombre TEXT NOT NULL,
          role INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        -- Tabla para guardar el perfil del usuario
        CREATE TABLE IF NOT EXISTS profile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cedula INTEGER UNIQUE,
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

        -- Tabla para guardar las personas registradas
        CREATE TABLE IF NOT EXISTS people (
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
          registrant_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (registrant_id) REFERENCES profile(cedula)
        );

        -- Insertar usuario por defecto
        INSERT OR REPLACE INTO users (username, password, nombre) 
        VALUES ('admin', 'admin123', 'Servidor');
        
        -- Asegurar actualización si el ID era diferente
        -- UPDATE users SET password = 'admin123' WHERE username = 'admin';

        PRAGMA user_version = ${latestVersion};
      `);
      currentVersion = latestVersion;

    } catch (error) {
      console.error('[DB] CRITICAL: Falló la inicialización:', error);
      throw error;
    }
  }

  // condicion de ejemplo para correr migraciones que modifiquen las tablas actuales
  if (currentVersion === 98) {
    try {

      // Migraciones manuales para tablas existentes
      console.error('Migraciones manuales para tablas existentes:');

      try {
        const usersInfo = await db.getAllAsync<{ name: string }>("PRAGMA table_info(users)");
        if (!usersInfo.some(c => c.name === 'role')) {
          // await db.execAsync("ALTER TABLE users ADD COLUMN role INTEGER DEFAULT 1;");
          // await db.execAsync("UPDATE users SET role = 1 WHERE username = 'admin';");
          // console.log("[DB] Columna 'role' añadida a users");
        }
      } catch (e) {
        console.error("[DB] Error migrando tabla users:", e);
      }

      // actualiza la version
      currentVersion = 99;
    } catch (error) {
      console.error('[DB] CRITICAL: Falló la migración:', error);
      throw error;
    }
  }

  await db.execAsync(`PRAGMA user_version = ${currentVersion};`);

  console.log(`[DB] Inicialización completada exitosamente v${currentVersion}`);

}
