import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── DB mock stubs (declared before vi.mock so they are accessible inside) ──

const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock('@/db/schema', () => ({
  alertRules: {
    id: 'alertRules.id',
    status: 'alertRules.status',
    deletedAt: 'alertRules.deletedAt',
    sceneTemplate: 'alertRules.sceneTemplate',
    triggerType: 'alertRules.triggerType',
    triggerCount: 'alertRules.triggerCount',
    ruleName: 'alertRules.ruleName',
    severity: 'alertRules.severity',
    recipientIds: 'alertRules.recipientIds',
    thresholdValue: 'alertRules.thresholdValue',
    thresholdUnit: 'alertRules.thresholdUnit',
    lastTriggeredAt: 'alertRules.lastTriggeredAt',
    updatedAt: 'alertRules.updatedAt',
  },
  alertHistories: {
    id: 'alertHistories.id',
    ruleId: 'alertHistories.ruleId',
    targetId: 'alertHistories.targetId',
    status: 'alertHistories.status',
    deletedAt: 'alertHistories.deletedAt',
    autoClosedAt: 'alertHistories.autoClosedAt',
    autoClosedReason: 'alertHistories.autoClosedReason',
    updatedAt: 'alertHistories.updatedAt',
    ruleName: 'alertHistories.ruleName',
    alertType: 'alertHistories.alertType',
    targetType: 'alertHistories.targetType',
    targetName: 'alertHistories.targetName',
    severity: 'alertHistories.severity',
    message: 'alertHistories.message',
    alertData: 'alertHistories.alertData',
  },
  projects: {
    id: 'projects.id',
    projectName: 'projects.projectName',
    projectStage: 'projects.projectStage',
    updatedAt: 'projects.updatedAt',
    deletedAt: 'projects.deletedAt',
    expectedDeliveryDate: 'projects.expectedDeliveryDate',
  },
  customers: {
    id: 'customers.id',
    customerName: 'customers.customerName',
    updatedAt: 'customers.updatedAt',
    deletedAt: 'customers.deletedAt',
    status: 'customers.status',
    lastInteractionTime: 'customers.lastInteractionTime',
    createdAt: 'customers.createdAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  lt: vi.fn(),
  lte: vi.fn(),
  gte: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  inArray: vi.fn(),
  or: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('@/lib/project-reporting', () => ({
  OPEN_PROJECT_LIFECYCLE_STAGES: ['opportunity', 'qualification', 'proposal', 'bidding'],
}));

const notifyInApp = vi.fn();
vi.mock('@/lib/alert-notifier', () => ({
  alertNotifier: { notifyInApp },
}));

// ── Helper: build a mock select chain ─────────────────────────────────────

/**
 * Creates a Drizzle-style select chain mock and registers it as the
 * next `mockImplementationOnce` on `selectMock`.
 *
 * @param result  - The value the terminal method resolves with.
 * @param terminal - Which method ends the chain: 'where' (default) or 'limit'.
 */
function queueSelect(result: unknown, terminal: 'where' | 'limit' = 'where') {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  if (terminal === 'limit') {
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn().mockResolvedValue(result);
  } else {
    chain.where = vi.fn().mockResolvedValue(result);
    chain.limit = vi.fn().mockResolvedValue(result); // fallback if limit is also called
  }
  selectMock.mockImplementationOnce(() => chain);
}

// ── Fixture data ───────────────────────────────────────────────────────────

const baseSignalRule = {
  id: 1,
  ruleName: '项目丢标预警',
  sceneTemplate: 'project_lost_signal',
  triggerType: 'signal',
  status: 'active',
  severity: 'high',
  recipientIds: [7],
  deletedAt: null,
};

const baseThresholdRule = {
  id: 10,
  ruleName: '项目长期未更新',
  sceneTemplate: 'project_not_updated',
  triggerType: 'threshold',
  status: 'active',
  severity: 'medium',
  recipientIds: [7],
  thresholdValue: 30,
  thresholdUnit: 'day',
  deletedAt: null,
};

/** Stale project that satisfies project_not_updated condition. */
const staleProject = (id: number, name: string) => ({
  id,
  projectName: name,
  updatedAt: new Date(Date.now() - 50 * 86_400_000), // 50 days ago
  projectStage: 'opportunity' as const,
});

// ══════════════════════════════════════════════════════════════════════════

describe('AlertExecutor', () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    notifyInApp.mockReset();
    notifyInApp.mockResolvedValue(undefined);
  });

  // ── executeThresholdRule ─────────────────────────────────────────────────

  describe('executeThresholdRule', () => {
    it('returns early when rule has no sceneTemplate, without fetching targets', async () => {
      queueSelect(
        [{ id: 2, sceneTemplate: null, triggerType: 'threshold', status: 'active', deletedAt: null }],
        'limit',
      );

      const { alertExecutor } = await import('@/lib/alert-executor');
      await alertExecutor.executeThresholdRule(2);

      // Only the rule lookup select fires; no target or history queries
      expect(selectMock).toHaveBeenCalledTimes(1);
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('returns early when rule triggerType is signal instead of threshold', async () => {
      queueSelect(
        [{ id: 3, sceneTemplate: 'project_lost_signal', triggerType: 'signal', status: 'active', deletedAt: null }],
        'limit',
      );

      const { alertExecutor } = await import('@/lib/alert-executor');
      await alertExecutor.executeThresholdRule(3);

      expect(selectMock).toHaveBeenCalledTimes(1);
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('auto-closes open alert whose target no longer satisfies the condition', async () => {
      // Select 1: rule lookup
      queueSelect([baseThresholdRule], 'limit');
      // Select 2: triggered targets — only project 10 is still stale
      queueSelect([staleProject(10, 'Proj A')]);
      // Select 3: two open alerts — 10 (still triggered) and 20 (no longer triggered)
      queueSelect([{ id: 201, targetId: 10 }, { id: 202, targetId: 20 }]);

      // update chain for auto_close of alert 202
      const autoCloseWhere = vi.fn().mockResolvedValue([]);
      const autoCloseSet = vi.fn(() => ({ where: autoCloseWhere }));
      updateMock.mockReturnValueOnce({ set: autoCloseSet });

      const { alertExecutor } = await import('@/lib/alert-executor');
      await alertExecutor.executeThresholdRule(10);

      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(autoCloseSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'auto_closed' }),
      );
      // project 10 already has an open alert → no new insert
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('creates a new alert for a triggered target with no existing open alert', async () => {
      // Select 1: rule lookup
      queueSelect([baseThresholdRule], 'limit');
      // Select 2: triggered targets — project 10
      queueSelect([staleProject(10, 'Proj B')]);
      // Select 3: no open alerts
      queueSelect([]);

      // insert chain
      const returningMock = vi.fn().mockResolvedValue([{ id: 301, ruleName: '项目长期未更新' }]);
      const valuesMock = vi.fn(() => ({ returning: returningMock }));
      insertMock.mockReturnValueOnce({ values: valuesMock });

      // update chain for rule stats
      const statsWhere = vi.fn().mockResolvedValue([]);
      const statsSet = vi.fn(() => ({ where: statsWhere }));
      updateMock.mockReturnValueOnce({ set: statsSet });

      const { alertExecutor } = await import('@/lib/alert-executor');
      await alertExecutor.executeThresholdRule(10);

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: baseThresholdRule.id,
          targetId: 10,
          targetType: 'project',
          targetName: 'Proj B',
          status: 'pending',
        }),
      );
      expect(notifyInApp).toHaveBeenCalledOnce();
      expect(notifyInApp).toHaveBeenCalledWith(301, [7], expect.stringContaining('Proj B'));
      // rule stats update
      expect(statsSet).toHaveBeenCalledWith(
        expect.objectContaining({ lastTriggeredAt: expect.any(Date) }),
      );
    });

    it('skips insert when open alert already exists for triggered target (dedup)', async () => {
      // Select 1: rule lookup
      queueSelect([baseThresholdRule], 'limit');
      // Select 2: triggered targets — project 10
      queueSelect([staleProject(10, 'Proj C')]);
      // Select 3: open alert already exists for project 10
      queueSelect([{ id: 201, targetId: 10 }]);

      const { alertExecutor } = await import('@/lib/alert-executor');
      await alertExecutor.executeThresholdRule(10);

      // No auto_close (10 is still triggered), no insert (10 already had open alert)
      expect(updateMock).not.toHaveBeenCalled();
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  // ── executeSignalAlert ───────────────────────────────────────────────────

  describe('executeSignalAlert', () => {
    it('skips insert when an open alert already exists for the same rule + target (dedup guard)', async () => {
      // Select 1: find matching signal rules
      queueSelect([baseSignalRule]);
      // Select 2: dedup check finds an existing open alert
      queueSelect([{ id: 99 }], 'limit');

      const { alertExecutor } = await import('@/lib/alert-executor');
      await alertExecutor.executeSignalAlert({
        sceneTemplate: 'project_lost_signal',
        targetId: 55,
        targetType: 'project',
        targetName: '测试项目A',
      });

      expect(insertMock).not.toHaveBeenCalled();
      expect(notifyInApp).not.toHaveBeenCalled();
    });

    it('inserts a new alert and calls notifyInApp when no open alert exists', async () => {
      // Select 1: matching rules
      queueSelect([baseSignalRule]);
      // Select 2: dedup check returns empty (no existing open alert)
      queueSelect([], 'limit');

      // Insert chain → returns created record
      const returningMock = vi.fn().mockResolvedValue([{ id: 100, ruleName: '项目丢标预警' }]);
      const valuesMock = vi.fn(() => ({ returning: returningMock }));
      insertMock.mockReturnValueOnce({ values: valuesMock });

      // Update chain → updates triggerCount / lastTriggeredAt
      const updateWhereMock = vi.fn().mockResolvedValue([]);
      const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
      updateMock.mockReturnValueOnce({ set: updateSetMock });

      const { alertExecutor } = await import('@/lib/alert-executor');
      await alertExecutor.executeSignalAlert({
        sceneTemplate: 'project_lost_signal',
        targetId: 55,
        targetType: 'project',
        targetName: '测试项目B',
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
        ruleId: 1,
        targetId: 55,
        targetType: 'project',
        targetName: '测试项目B',
        status: 'pending',
      }));
      expect(notifyInApp).toHaveBeenCalledOnce();
      expect(notifyInApp).toHaveBeenCalledWith(100, [7], expect.stringContaining('测试项目B'));
      expect(updateMock).toHaveBeenCalledTimes(1);
    });
  });
});
