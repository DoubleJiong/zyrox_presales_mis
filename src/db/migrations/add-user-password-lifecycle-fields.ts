import { db } from '@/db';

export async function addUserPasswordLifecycleFields() {
  await db.execute(`
    ALTER TABLE sys_user
    ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS password_changed_at timestamp,
    ADD COLUMN IF NOT EXISTS password_reset_at timestamp,
    ADD COLUMN IF NOT EXISTS password_reset_by integer REFERENCES sys_user(id)
  `);
}