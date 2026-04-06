import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProjectStageSnapshot = vi.fn();
const updateProjectStage = vi.fn();
const insertProjectStageTransition = vi.fn();

vi.mock('@/modules/project/project-stage-repository', () => ({
  getProjectStageSnapshot,
  updateProjectStage,
  insertProjectStageTransition,
}));

describe('project stage service', () => {
  beforeEach(() => {
    getProjectStageSnapshot.mockReset();
    updateProjectStage.mockReset();
    insertProjectStageTransition.mockReset();
  });

  it('transitions a project through the governed state machine and writes transition history', async () => {
    getProjectStageSnapshot.mockResolvedValue({
      id: 101,
      projectName: '样例项目',
      projectStage: 'opportunity',
      status: 'draft',
    });

    const { transitionProjectStage } = await import('../../../src/modules/project/project-stage-service');

    const result = await transitionProjectStage({
      projectId: 101,
      toStage: 'bidding_pending',
      operatorId: 8,
      triggerType: 'approval_submitted',
      triggerId: 501,
      reason: '提交投标立项审批',
    });

    expect(updateProjectStage).toHaveBeenCalledWith(101, 'bidding_pending', 'ongoing');
    expect(insertProjectStageTransition).toHaveBeenCalledWith({
      projectId: 101,
      fromStage: 'opportunity',
      toStage: 'bidding_pending',
      triggerType: 'approval_submitted',
      triggerId: 501,
      operatorId: 8,
      reason: '提交投标立项审批',
    });
    expect(result).toMatchObject({
      projectId: 101,
      fromStage: 'opportunity',
      toStage: 'bidding_pending',
      compatStatus: 'ongoing',
    });
  });

  it('rejects unsupported transitions', async () => {
    getProjectStageSnapshot.mockResolvedValue({
      id: 102,
      projectName: '样例项目',
      projectStage: 'opportunity',
      status: 'draft',
    });

    const { transitionProjectStage } = await import('../../../src/modules/project/project-stage-service');

    await expect(
      transitionProjectStage({
        projectId: 102,
        toStage: 'delivering',
        operatorId: 8,
        triggerType: 'manual',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_STAGE_TRANSITION',
      status: 409,
    });

    expect(updateProjectStage).not.toHaveBeenCalled();
    expect(insertProjectStageTransition).not.toHaveBeenCalled();
  });
});