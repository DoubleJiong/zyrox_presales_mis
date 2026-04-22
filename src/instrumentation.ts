/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Runs once per server process start (not on every request).
 * We use this to start the pg-boss alert scheduler.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { alertScheduler } = await import('@/lib/alert-scheduler');
    await alertScheduler.start();
  }
}
