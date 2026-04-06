import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: '.env.local' });

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs', 'plans', 'evidence', '2026-04-06-task8-data-screen');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'task8-fourth-batch-candidates.json');

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const result = await client.query<{
      id: number;
      projectName: string;
      region: string;
      projectAmount: string;
    }>(`
      select
        p.id,
        p.project_name as "projectName",
        coalesce(p.region, '未分配') as region,
        coalesce(p.estimated_amount, 0)::text as "projectAmount"
      from bus_project p
      left join bus_project_opportunity o
        on o.project_id = p.id
      where p.deleted_at is null
        and p.project_stage = 'opportunity'
        and o.id is null
        and coalesce(p.project_name, '') not like '稳定性归档编辑项目-%'
      order by coalesce(p.estimated_amount, 0) desc, p.id asc
      limit 8
    `);

    const payload = {
      generatedAt: new Date().toISOString(),
      candidateCount: result.rows.length,
      rows: result.rows.map((row) => ({
        ...row,
        projectAmount: Number(row.projectAmount),
      })),
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error('task8-select-fourth-batch-candidates failed:', error);
  process.exitCode = 1;
});