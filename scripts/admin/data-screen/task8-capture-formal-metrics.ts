import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import jwt from 'jsonwebtoken';
import { request } from 'playwright';

loadEnv({ path: '.env.local' });

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs', 'plans', 'evidence', '2026-04-06-task8-data-screen');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'task8-formal-metrics-after-fourth-batch.json');
const BASE_URL = 'http://localhost:5004';

async function main() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const token = jwt.sign(
    {
      userId: 1,
      email: 'admin@zhengyuan.com',
      roleCode: 'ADMIN',
      roleId: 1,
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: 'zhengyuan-presales',
    },
  );

  const apiContext = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  try {
    const overviewResponse = await apiContext.get('/api/data-screen/overview?startDate=2026-03-07&endDate=2026-04-06');
    const presalesResponse = await apiContext.get('/api/data-screen/presales-focus-summary?startDate=2026-03-07&endDate=2026-04-06');

    const overviewPayload = await overviewResponse.json();
    const presalesPayload = await presalesResponse.json();

    const payload = {
      generatedAt: new Date().toISOString(),
      overviewStatus: overviewResponse.status(),
      presalesStatus: presalesResponse.status(),
      funnel: overviewPayload?.data?.funnel || null,
      presalesSummary: presalesPayload?.data?.summary || presalesPayload?.data || null,
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await apiContext.dispose();
  }
}

void main().catch((error) => {
  console.error('task8-capture-formal-metrics failed:', error);
  process.exitCode = 1;
});