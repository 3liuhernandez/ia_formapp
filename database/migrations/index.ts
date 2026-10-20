import type { SQLiteDatabase } from 'expo-sqlite';
import { m001_initial } from './m001_initial';

export type Migration = {
  version: number;                          // versión a la que lleva
  name: string;                             // solo para logs
  up: (db: SQLiteDatabase) => Promise<void>;
};

/**
 * Ordenadas de menor a mayor por `version`.
 * NUNCA reordenar ni borrar migraciones ya publicadas.
 */
export const migrations: Migration[] = [
  m001_initial,
];

export const LATEST_VERSION = migrations[migrations.length - 1].version;