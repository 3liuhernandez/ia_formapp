import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect } from 'react'

export const test_db = () => {

    const db = useSQLiteContext();
    useEffect(() => {
    (async () => {
        const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        );
        console.log('Tablas:', tables.map(t => t.name)); // ['people','profile','user']
        const admin = await db.getFirstAsync('SELECT * FROM user WHERE username = ?', ['admin']);
        console.log('Admin:', admin);
    })();
    }, [db]);

  return (
    <div>test_db</div>
  )
}
