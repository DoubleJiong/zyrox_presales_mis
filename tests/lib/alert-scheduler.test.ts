import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mock boss so it's accessible both inside vi.mock and in tests ─────
const mockBoss = vi.hoisted(() => ({
  start: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  unschedule: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('pg-boss', () => ({
  // Must use regular functions (not arrow functions) so `new PgBoss(...)` works.
  // When a constructor returns an object, that object is used by `new`.
  PgBoss: vi.fn(function () { return mockBoss; }),
  default: vi.fn(function () { return mockBoss; }),
}));

vi.mock('@/shared/config/env', () => ({
  getEnv: vi.fn().mockReturnValue({ DATABASE_URL: 'postgresql://localhost/test' }),
}));

vi.mock('@/lib/operation-logger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}));

// ── DB mock ───────────────────────────────────────────────────────────────────
const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const selectFn = vi.fn(() => ({ from: selectFrom }));

const updateWhere = vi.fn().mockResolvedValue(undefined);
const updateSet = vi.fn(() => ({ where: updateWhere }));
const updateFn = vi.fn(() => ({ set: updateSet }));

vi.mock('@/db', () => ({
  db: {
    select: selectFn,
    update: updateFn,
  },
}));

vi.mock('@/db/schema', () => ({
  alertRules: {
    id: 'alert_rules.id',
    status: 'alert_rules.status',
    triggerType: 'alert_rules.trigger_type',
    sceneTemplate: 'alert_rules.scene_template',
    cronExpression: 'alert_rules.cron_expression',
    deletedAt: 'alert_rules.deleted_at',
    pgBossJobName: 'alert_rules.pg_boss_job_name',
    updatedAt: 'alert_rules.updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue('eq_condition'),
  and: vi.fn().mockReturnValue('and_condition'),
  isNull: vi.fn().mockReturnValue('isNull_condition'),
  isNotNull: vi.fn().mockReturnValue('isNotNull_condition'),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('alert-scheduler', () => {
  beforeEach(() => {
    mockBoss.start.mockClear();
    mockBoss.createQueue.mockClear();
    mockBoss.work.mockClear();
    mockBoss.schedule.mockClear();
    mockBoss.unschedule.mockClear();
    selectFn.mockClear();
    selectFrom.mockClear();
    selectWhere.mockClear();
    selectLimit.mockClear();
    updateFn.mockClear();
    updateSet.mockClear();
    updateWhere.mockClear();
  });

  // ── start() ────────────────────────────────────────────────────────────────
  // start() uses: db.select().from().where()  [no .limit()]

  describe('start()', () => {
    beforeEach(() => {
      // startup scan awaits where() directly — no .limit() call
      selectWhere.mockResolvedValue([]);
    });

    it('calls boss.start on initialization', async () => {
      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');
      await alertScheduler.start();

      expect(mockBoss.start).toHaveBeenCalledTimes(1);
    });

    it('registers the alert-signal worker on start', async () => {
      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');
      await alertScheduler.start();

      expect(mockBoss.createQueue).toHaveBeenCalledWith('alert-signal');
      expect(mockBoss.work).toHaveBeenCalledWith('alert-signal', expect.any(Function));
    });

    it('startup scan registers all active threshold rules', async () => {
      const rules = [
        { id: 10, sceneTemplate: 'project_not_updated', cronExpression: '0 9 * * *' },
        { id: 11, sceneTemplate: 'project_overdue', cronExpression: '0 9 * * *' },
      ];
      selectWhere.mockResolvedValue(rules);

      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');
      await alertScheduler.start();

      expect(mockBoss.schedule).toHaveBeenCalledTimes(2);
      expect(mockBoss.schedule).toHaveBeenCalledWith('alert-rule-10', '0 9 * * *', { ruleId: 10 });
      expect(mockBoss.schedule).toHaveBeenCalledWith('alert-rule-11', '0 9 * * *', { ruleId: 11 });
    });

    it('startup scan skips rules missing sceneTemplate or cronExpression', async () => {
      const rules = [
        { id: 12, sceneTemplate: null, cronExpression: '0 9 * * *' },
        { id: 13, sceneTemplate: 'project_overdue', cronExpression: null },
      ];
      selectWhere.mockResolvedValue(rules);

      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');
      await alertScheduler.start();

      expect(mockBoss.schedule).not.toHaveBeenCalled();
    });
  });

  // ── scheduleRule() ─────────────────────────────────────────────────────────
  // scheduleRule() uses: db.select().from().where().limit(1)

  describe('scheduleRule()', () => {
    beforeEach(() => {
      selectWhere.mockReturnValue({ limit: selectLimit });
    });

    it('registers threshold rule in pg-boss and persists job name to db', async () => {
      const rule = { id: 20, sceneTemplate: 'project_not_updated', cronExpression: '*/30 * * * *' };
      selectLimit.mockResolvedValue([rule]);

      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');
      await alertScheduler.scheduleRule(20);

      expect(mockBoss.schedule).toHaveBeenCalledWith('alert-rule-20', '*/30 * * * *', { ruleId: 20 });
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({ pgBossJobName: 'alert-rule-20' }),
      );
    });
  });

  // ── unscheduleRule() ───────────────────────────────────────────────────────

  describe('unscheduleRule()', () => {
    it('removes pg-boss schedule and clears job name from db', async () => {
      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');
      await alertScheduler.unscheduleRule(30);

      expect(mockBoss.unschedule).toHaveBeenCalledWith('alert-rule-30');
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({ pgBossJobName: null }),
      );
    });
  });

  // ── rescheduleRule() ───────────────────────────────────────────────────────
  // rescheduleRule() calls unschedule then scheduleRule (which needs .where().limit())

  describe('rescheduleRule()', () => {
    beforeEach(() => {
      selectWhere.mockReturnValue({ limit: selectLimit });
    });

    it('calls unschedule then scheduleRule for the same rule id', async () => {
      const rule = { id: 40, sceneTemplate: 'project_overdue', cronExpression: '0 9 * * 1' };
      selectLimit.mockResolvedValue([rule]);

      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');

      const callOrder: string[] = [];
      mockBoss.unschedule.mockImplementation(() => {
        callOrder.push('unschedule');
        return Promise.resolve(undefined);
      });
      mockBoss.schedule.mockImplementation(() => {
        callOrder.push('schedule');
        return Promise.resolve(undefined);
      });

      await alertScheduler.rescheduleRule(40);

      expect(callOrder[0]).toBe('unschedule');
      expect(callOrder).toContain('schedule');
      expect(mockBoss.unschedule).toHaveBeenCalledWith('alert-rule-40');
      expect(mockBoss.schedule).toHaveBeenCalledWith('alert-rule-40', '0 9 * * 1', { ruleId: 40 });
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('logs to operation log when boss.start throws and does not propagate', async () => {
      const { logOperation } = await import('@/lib/operation-logger');
      (logOperation as ReturnType<typeof vi.fn>).mockClear();
      mockBoss.start.mockRejectedValueOnce(new Error('pg-boss connection refused'));

      const { alertScheduler } = await import('../../../src/lib/alert-scheduler');
      await expect(alertScheduler.start()).resolves.not.toThrow();

      expect(logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'alert-scheduler',
          action: 'start',
          status: 'failed',
        }),
      );
    });
  });
});
