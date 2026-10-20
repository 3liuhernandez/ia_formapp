import type { SQLiteDatabase } from 'expo-sqlite';

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  // ¿Ya hay datos? No seedear dos veces.
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM profile'
  );
  if ((row?.count ?? 0) > 0) {
    console.log('[DB] Seed omitido: ya existen datos.');
    return;
  }

  console.log('[DB] Insertando datos de ejemplo...');

  await db.withTransactionAsync(async () => {
    // ── 1. Perfil del usuario registrador (operador en campo) ──
    const profileResult = await db.runAsync(
      `INSERT INTO profile
        (dni, name, last_name, phone, email, gender, brand, model, os_version, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '12345678',
        'María',
        'Pérez',
        '04141234567',
        'maria@example.com',
        'F',
        'Samsung',
        'Galaxy A54',
        'Android 13',
        'device-abc-123',
      ]
    );
    const profileId = profileResult.lastInsertRowId;

    // ── 2. Usuario "register" vinculado a ese perfil ──
    await db.runAsync(
      `INSERT INTO user (username, password, name, role, profile_id)
       VALUES (?, ?, ?, ?, ?)`,
      ['maria', 'maria123', 'María Pérez', 'register', profileId]
    );

    // ── 3. Personas registradas por María ──
    await db.runAsync(
      `INSERT INTO people
        (dni, name, last_name, phone, phone_optional, email, address, parish,
         address_reference, gender, birthday_date, comments,
         visit_day, visit_time, registrant_dni, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '20111222', 'José', 'Rodríguez', '04241234567', '',
        'jose@example.com', 'Av. Bolívar, Casa 12', 'San Juan',
        'Frente a la plaza', 'M', '1985-03-14', 'Interesado en apoyo',
        '2026-10-17', '10:30', '12345678', 0,
      ]
    );

    await db.runAsync(
      `INSERT INTO people
        (dni, name, last_name, phone, email, address, parish,
         address_reference, gender, birthday_date, visit_day, visit_time,
         registrant_dni, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '15222333', 'Ana', 'Gómez', '04161112233', '',
        'Calle Sucre #45', 'El Paraíso', 'Casa azul con rejas',
        'F', '1992-07-22', '2026-10-17', '11:00', '12345678', 0,
      ]
    );

    console.log('[DB] Seed completado.');
  });
}