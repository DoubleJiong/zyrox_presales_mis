import { open, unlink } from 'node:fs/promises';
import path from 'node:path';

const LOCK_PATH = path.join(process.cwd(), '.playwright-admin-workbench.lock');

export async function acquireWorkbenchLock(timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const handle = await open(LOCK_PATH, 'wx');

      return async () => {
        await handle.close();
        await unlink(LOCK_PATH).catch(() => undefined);
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error('Timed out acquiring admin workbench test lock');
}