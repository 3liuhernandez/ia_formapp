import type { Migration } from './index';

export const m002_add_photo: Migration = {
  version: 2,
  name: 'add_photo_to_people',
  async up(db) {
    await db.execAsync(`
      ALTER TABLE people ADD COLUMN photo_uri TEXT DEFAULT '';

      CREATE INDEX IF NOT EXISTS idx_people_visit_day ON people(visit_day);
    `);
  },
};