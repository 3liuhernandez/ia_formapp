import {
    peopleRepo,
    type NewPerson,
    type Person,
} from '@/database/repositories/people.repository';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

export function usePeople() {
  const db = useSQLiteContext();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPeople(await peopleRepo.list(db));
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const search = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        await refresh();
        return;
      }
      setLoading(true);
      try {
        setPeople(await peopleRepo.search(db, term));
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    },
    [db, refresh]
  );

  const add = useCallback(
    async (p: NewPerson) => {
      const id = await peopleRepo.insert(db, p);
      await refresh();
      return id;
    },
    [db, refresh]
  );

  const getById = useCallback(
    async (id: number) => peopleRepo.getById(db, id),
    [db]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { people, loading, error, refresh, search, add, getById };
}