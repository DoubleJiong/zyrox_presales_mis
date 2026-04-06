import { hashPassword } from '../lib/auth';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

async function updatePasswords() {
  const password = process.env.RESET_PASSWORD;
  if (!password) {
    throw new Error('RESET_PASSWORD environment variable is required');
  }

  const passwordHash = await hashPassword(password);
  const resetAt = new Date();

  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    await db
      .update(users)
      .set({
        password: passwordHash,
        mustChangePassword: true,
        passwordResetAt: resetAt,
        passwordResetBy: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    console.log(`Updated password for user: ${user.email}`);
  }

  console.log('All passwords updated successfully. Users must change password on next login.');
  process.exit(0);
}

updatePasswords().catch((error) => {
  console.error('Error updating passwords:', error);
  process.exit(1);
});
