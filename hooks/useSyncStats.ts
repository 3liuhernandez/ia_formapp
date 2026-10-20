import { peopleRepo } from '@/database/repositories/people.repository';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

export type SyncStats = {
  total: number;
  synced: number;
  pending: number;
};

export function useSyncStats(opts?: {
  registrantDni?: string;
  only24h?: boolean;
}) {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<SyncStats>({ total: 0, synced: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await peopleRepo.getStats(db, opts));
    } finally {
      setLoading(false);
    }
  }, [db, opts?.registrantDni, opts?.only24h]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}