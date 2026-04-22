/**
 * Alert Scheduler — Phase 3
 *
 * pg-boss singleton with full worker registration:
 *
 * Signal worker  : boss.work('alert-signal', handler)  — registered once on boot
 * Threshold crons: boss.schedule('alert-rule-{id}', cron, { ruleId })  — one per active rule
 *
 * Startup scan (Q3=Y): on start(), scan all active threshold rules that have a
 * sceneTemplate and re-register them with pg-boss (idempotent — schedule() upserts).
 *
 * Scheduler errors (Q4=P): never throw; always log to sys_operation_log via
 * logOperation() so the system-logs page can surface them for monitoring.
 */
import { PgBoss } from 'pg-boss';
import { db } from '@/db';
import { alertRules } from '@/db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { getEnv } from '@/shared/config/env';
import { logOperation } from '@/lib/operation-logger';

// ── Singleton ────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __presalesAlertBoss__: PgBoss | undefined;
}

function createBoss(): PgBoss {
  const { DATABASE_URL } = getEnv();
  return new PgBoss(DATABASE_URL);
}

const boss: PgBoss = globalThis.__presalesAlertBoss__ ?? createBoss();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__presalesAlertBoss__ = boss;
}

// ── Internal helpers ─────────────────────────────────────────

const SYSTEM_USER_ID = 0; // sentinel for scheduler-generated log entries

function jobName(ruleId: number): string {
  return `alert-rule-${ruleId}`;
}

/** Write a failed scheduling event to sys_operation_log for monitoring. */
async function logSchedulerError(
  action: string,
  ruleId: number | null,
  err: unknown,
): Promise<void> {
  console.error(`[alert-scheduler] ${action} ruleId=${ruleId ?? 'N/A'}:`, err);
  try {
    await logOperation({
      userId: SYSTEM_USER_ID,
      module: 'alert-scheduler',
      action,
      resource: 'alert_rule',
      resourceId: ruleId ?? undefined,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    });
  } catch {
    // logOperation itself failed — nothing we can do but keep going
  }
}

/** Register the pg-boss cron schedule + worker for one threshold rule. */
async function _registerThresholdRule(rule: {
  id: number;
  sceneTemplate: string | null;
  cronExpression: string | null;
}): Promise<void> {
  if (!rule.sceneTemplate || !rule.cronExpression) return;

  const name = jobName(rule.id);
  // createQueue is idempotent; must exist before schedule() and work()
  await boss.createQueue(name);
  // schedule() is idempotent: if the cron already exists with the same expression it is a no-op
  await boss.schedule(name, rule.cronExpression, { ruleId: rule.id });
  await boss.work<{ ruleId: number }>(name, async (jobs) => {
    const { alertExecutor } = await import('@/lib/alert-executor');
    for (const job of jobs) {
      await alertExecutor.executeThresholdRule(job.data.ruleId);
    }
  });
}

// ── Public interface ─────────────────────────────────────────

/**
 * Bootstraps pg-boss, registers the signal worker, and (re-)registers all active
 * threshold rules (startup scan, Q3=Y).
 */
async function start(): Promise<void> {
  try {
    await boss.start();
    console.log('[alert-scheduler] pg-boss started ✓');
  } catch (err) {
    await logSchedulerError('start', null, err);
    return; // if boss won't start, workers can't be registered either
  }

  // Register signal worker (once per process)
  try {
    await boss.createQueue('alert-signal');
    await boss.work<import('@/lib/alert-executor').SignalAlertJobData>(
      'alert-signal',
      async (jobs) => {
        const { alertExecutor } = await import('@/lib/alert-executor');
        for (const job of jobs) {
          await alertExecutor.executeSignalAlert(job.data);
        }
      },
    );
    console.log('[alert-scheduler] alert-signal worker registered ✓');
  } catch (err) {
    await logSchedulerError('register-signal-worker', null, err);
  }

  // Startup scan: re-register all active threshold rules
  try {
    const activeRules = await db
      .select({
        id: alertRules.id,
        sceneTemplate: alertRules.sceneTemplate,
        cronExpression: alertRules.cronExpression,
      })
      .from(alertRules)
      .where(
        and(
          eq(alertRules.status, 'active'),
          eq(alertRules.triggerType, 'threshold'),
          isNotNull(alertRules.sceneTemplate),
          isNotNull(alertRules.cronExpression),
          isNull(alertRules.deletedAt),
        ),
      );

    let registered = 0;
    for (const rule of activeRules) {
      try {
        await _registerThresholdRule(rule);
        registered++;
      } catch (err) {
        await logSchedulerError('startup-scan-register-rule', rule.id, err);
      }
    }
    console.log(`[alert-scheduler] startup scan: ${registered}/${activeRules.length} threshold rules registered ✓`);
  } catch (err) {
    await logSchedulerError('startup-scan', null, err);
  }
}

/**
 * Registers (or re-registers) a cron job for a threshold rule.
 * Called after POST /api/alerts/rules when triggerType='threshold'.
 * Silently logs & swallows errors (Q4=P).
 */
async function scheduleRule(ruleId: number): Promise<void> {
  try {
    const [rule] = await db
      .select({ id: alertRules.id, sceneTemplate: alertRules.sceneTemplate, cronExpression: alertRules.cronExpression })
      .from(alertRules)
      .where(and(eq(alertRules.id, ruleId), isNull(alertRules.deletedAt)))
      .limit(1);

    if (!rule) return;
    await _registerThresholdRule(rule);

    // Persist job name back to rule row
    await db
      .update(alertRules)
      .set({ pgBossJobName: jobName(ruleId), updatedAt: new Date() })
      .where(eq(alertRules.id, ruleId));
  } catch (err) {
    await logSchedulerError('schedule-rule', ruleId, err);
  }
}

/**
 * Removes the cron job for a rule.
 * Called after DELETE or when a rule is deactivated.
 */
async function unscheduleRule(ruleId: number): Promise<void> {
  try {
    await boss.unschedule(jobName(ruleId));
    await db
      .update(alertRules)
      .set({ pgBossJobName: null, updatedAt: new Date() })
      .where(eq(alertRules.id, ruleId));
  } catch (err) {
    await logSchedulerError('unschedule-rule', ruleId, err);
  }
}

/**
 * Removes then re-registers a cron job.
 * Called after PUT when cronExpression or status changes.
 */
async function rescheduleRule(ruleId: number): Promise<void> {
  try {
    await boss.unschedule(jobName(ruleId));
    await scheduleRule(ruleId);
  } catch (err) {
    await logSchedulerError('reschedule-rule', ruleId, err);
  }
}

export const alertScheduler = { start, scheduleRule, unscheduleRule, rescheduleRule };
export { boss as alertBoss };
