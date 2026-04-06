import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: '.env.local' });

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs', 'plans', 'evidence', '2026-04-06-task8-data-screen');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'task8-fourth-batch-result.json');

const seedRows = [
  {
    projectId: 133,
    projectName: '中国石油大学(北京)智慧校园(三期)',
    opportunityStage: 'qualified',
    expectedAmount: 7_200_000,
    winProbability: 70,
    expectedCloseDate: '2026-07-22',
    nextAction: '测试数据回填：推进 qualified 阶段商机',
    nextActionDate: '2026-04-22',
  },
  {
    projectId: 266,
    projectName: '哈尔滨体育学院智慧校园二期策划',
    opportunityStage: 'qualified',
    expectedAmount: 7_000_000,
    winProbability: 70,
    expectedCloseDate: '2026-07-24',
    nextAction: '测试数据回填：推进 qualified 阶段商机',
    nextActionDate: '2026-04-23',
  },
  {
    projectId: 330,
    projectName: '衢州教育局银校合作',
    opportunityStage: 'qualified',
    expectedAmount: 6_800_000,
    winProbability: 70,
    expectedCloseDate: '2026-07-26',
    nextAction: '测试数据回填：推进 qualified 阶段商机',
    nextActionDate: '2026-04-24',
  },
  {
    projectId: 159,
    projectName: '大同大学物联校园项目',
    opportunityStage: 'qualified',
    expectedAmount: 6_000_000,
    winProbability: 70,
    expectedCloseDate: '2026-07-28',
    nextAction: '测试数据回填：推进 qualified 阶段商机',
    nextActionDate: '2026-04-25',
  },
  {
    projectId: 397,
    projectName: '哈尔滨商业大学智慧校园',
    opportunityStage: 'qualified',
    expectedAmount: 5_500_000,
    winProbability: 70,
    expectedCloseDate: '2026-07-30',
    nextAction: '测试数据回填：推进 qualified 阶段商机',
    nextActionDate: '2026-04-26',
  },
];

async function countMissing(client: Client) {
  const result = await client.query<{ missingCount: string }>(`
    select count(*)::text as "missingCount"
    from bus_project p
    left join bus_project_opportunity po on po.project_id = p.id
    where p.deleted_at is null
      and p.project_stage = 'opportunity'
      and p.bid_result is distinct from 'won'
      and po.id is null
  `);

  return Number(result.rows[0]?.missingCount || 0);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const beforeMissingCount = await countMissing(client);

    await client.query('begin');

    const insertedRows: Array<{ projectId: number; projectName: string }> = [];

    for (const seed of seedRows) {
      const existing = await client.query<{ id: number }>(
        'select id from bus_project_opportunity where project_id = $1',
        [seed.projectId],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        continue;
      }

      await client.query(
        `
          insert into bus_project_opportunity (
            project_id,
            opportunity_stage,
            expected_amount,
            win_probability,
            expected_close_date,
            next_action,
            next_action_date,
            created_at,
            updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, now(), now())
        `,
        [
          seed.projectId,
          seed.opportunityStage,
          seed.expectedAmount,
          seed.winProbability,
          seed.expectedCloseDate,
          seed.nextAction,
          seed.nextActionDate,
        ],
      );

      insertedRows.push({ projectId: seed.projectId, projectName: seed.projectName });
    }

    const afterMissingCount = await countMissing(client);
    await client.query('commit');

    const payload = {
      generatedAt: new Date().toISOString(),
      batch: 'task8-fourth-batch',
      beforeMissingCount,
      insertedCount: insertedRows.length,
      afterMissingCount,
      insertedRows,
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
    console.log(JSON.stringify(payload, null, 2));
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error('task8-execute-fourth-batch failed:', error);
  process.exitCode = 1;
});