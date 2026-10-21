import type { Profile } from '@/database/repositories/profile.repository';

/**
 * Usuario en sesión (SecureStore). NO es la fila de la DB.
 * Derivado de UserRow al hacer login, + Profile adjunto.
 */
export interface User {
  id: number;
  username: string;
  name: string;
  role_id: number;
  role_name: 'register' | 'admin';
  profile?: Profile | null;
  token?: string;
  expiresAt?: number; // timestamp en ms
}

export interface SyncStats {
  total: number;
  synced: number;
  pending: number;
}
