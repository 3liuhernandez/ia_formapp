import { userRepo, type User } from '@/database/repositories/user.repository';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

export type NewUser = {
  username: string;
  password: string;
  name: string;
  role_id: number;
  role_name?: 'register' | 'admin';
  profile_id?: number | null;
};

export function useUser() {
  const db = useSQLiteContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await userRepo.list(db));
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const create = useCallback(
    async (u: NewUser) => {
      const id = await userRepo.create(db, u);
      await loadAll();
      return id;
    },
    [db, loadAll]
  );

  const updateRole = useCallback(
    async (id: number, role_name: 'register' | 'admin') => {
      await userRepo.updateRole(db, id, role_name);
      await loadAll();
    },
    [db, loadAll]
  );

  const getById = useCallback(
    async (id: number) => userRepo.findById(db, id),
    [db]
  );

  return { users, loading, error, loadAll, create, updateRole, getById };
}