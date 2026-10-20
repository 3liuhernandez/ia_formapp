import {
  profileRepo,
  type Profile,
  type ProfileInput,
} from '@/database/repositories/profile.repository';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

export function useProfile() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await profileRepo.get(db);
      setProfile(p);
      setHasProfile(!!p);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const save = useCallback(
    async (data: ProfileInput): Promise<Profile | null> => {
      await profileRepo.upsert(db, data);
      await refresh();
      return profileRepo.get(db);   // ← devuelve el Profile completo
    },
    [db, refresh]
  );

  const update = useCallback(
    async (data: Partial<ProfileInput>) => {
      if (!profile) throw new Error('No hay perfil para actualizar');
      await profileRepo.update(db, profile.id, data);
      await refresh();
    },
    [db, profile, refresh]
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { profile, hasProfile, loading, error, refresh, save, update };
}