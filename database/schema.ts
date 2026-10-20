import type { SQLiteDatabase } from 'expo-sqlite';
import { LATEST_VERSION, migrations } from './migrations';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {

  // ************************************************************ //
  // Temporal, solo en dev — pega esto antes de initializeDatabase
  if (__DEV__) {
    // await db.execAsync('PRAGMA user_version = 1;'); // ← finge que venía de v1
  }
  // await initializeDatabase(db);
  // ************************************************************ //

  // ************************************************************ //
    // 🧪 Técnica C — Borrar la DB y empezar de cero
    // Para verificar que un fresh install corre todas las migraciones en orden:

    if (__DEV__) {
      // await SQLite.deleteDatabaseAsync('app.db');
    }
  // ************************************************************ //


  // foreign_keys siempre OFF durante migraciones (SQLite lo exige para ALTER)
  await db.execAsync(`
    PRAGMA journal_mode = 'delete';
    PRAGMA foreign_keys = OFF;
  `);

  const version = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );

  const currentVersion = version?.user_version ?? 0;

  console.log(
    `[DB] Versión actual: ${currentVersion} | latest: ${LATEST_VERSION}`
  );

  if (currentVersion >= LATEST_VERSION) {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return;
  }

  // Migraciones pendientes, en orden
  const pending = migrations
  .filter((m) => m.version > currentVersion)
  .sort((a, b) => a.version - b.version);

  for (const m of pending) {
    console.log(`[DB] Migrando v${m.version} → ${m.name}...`);
    try {
      await db.withTransactionAsync(async () => {
        await m.up(db);
        // user_version se escribe dentro de la misma transacción
        // para que sea atómico con el cambio de esquema
        await db.execAsync(`PRAGMA user_version = ${m.version};`);
      });
      console.log(`[DB] ✔ v${m.version} aplicada`);
    } catch (error) {
      console.error(`[DB] ✖ Falló migración v${m.version}:`, error);
      throw error; // aborta todo; la app no debe seguir con DB inconsistente
    }
  }

    await db.execAsync('PRAGMA foreign_keys = ON;');

    console.log(`[DB] Migraciones completadas. Versión final: ${LATEST_VERSION}`);

}