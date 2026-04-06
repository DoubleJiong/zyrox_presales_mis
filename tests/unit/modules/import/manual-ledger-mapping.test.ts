import { describe, expect, it } from 'vitest';

import {
  mapLedgerBusinessState,
  normalizeLedgerProject,
  parseLedgerDate,
  parseLedgerYear,
} from '@/modules/import/manual-ledger-mapping';

describe('manual ledger mapping', () => {
  it('maps business statuses into the user-confirmed three-stage model', () => {
    expect(mapLedgerBusinessState('支持')).toEqual({
      projectStage: 'opportunity',
      status: 'lead',
      bidResult: null,
    });

    expect(mapLedgerBusinessState('已签单')).toEqual({
      projectStage: 'archived',
      status: 'won',
      bidResult: 'won',
    });

    expect(mapLedgerBusinessState('丢标')).toEqual({
      projectStage: 'archived',
      status: 'lost',
      bidResult: 'lost',
    });
  });

  it('parses ledger dates and years from mixed Excel formats', () => {
    expect(parseLedgerYear('2025年')).toBe(2025);
    expect(parseLedgerDate('2025/03/29')).toBe('2025-03-29');
    expect(parseLedgerDate(45700)).toBe('2025-02-12');
  });

  it('normalizes a ledger row into import-ready project data', () => {
    const normalized = normalizeLedgerProject({
      year: '2025年',
      projectName: '台州学院建行投资过单项目',
      projectType: '总包',
      secondaryProjectType: '智慧校园',
      region: '温台',
      salesName: '许正森',
      customerName: '台州学院',
      customerType: '高校',
      budgetAmount: 12000000,
      status: '已签单',
      signedAmount: 9289000,
      bidOpenDate: 45700,
      presalesOwner: '李靖翔',
      contractNumber: '台州-25-07、08',
      remark: '样本备注',
      externalProjectCode: 'ABC-001',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.projectStage).toBe('archived');
    expect(normalized?.status).toBe('won');
    expect(normalized?.actualAmount).toBe('9289000.00');
    expect(normalized?.estimatedAmount).toBe('12000000.00');
    expect(normalized?.industry).toBe('education');
    expect(normalized?.preferredManagerNames).toEqual(['李靖翔', '许正森']);
    expect(normalized?.description).toContain('台账样本导入');
  });
});