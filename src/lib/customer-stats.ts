import { resolveProjectLifecycleBucket } from '@/lib/project-reporting';

interface CustomerProjectStatsRow {
  projectStage: string | null;
  bidResult: string | null;
  status: string | null;
  amount: string | null;
}

function toAmount(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeCustomerProjectStats(rows: CustomerProjectStatsRow[]) {
  let totalWonAmount = 0;
  let maxWonProjectAmount = 0;
  let currentProjectCount = 0;

  for (const row of rows) {
    const amount = toAmount(row.amount);
    if (row.bidResult === 'won') {
      totalWonAmount += amount;
      maxWonProjectAmount = Math.max(maxWonProjectAmount, amount);
    }

    const lifecycleBucket = resolveProjectLifecycleBucket(row);
    if (lifecycleBucket === 'lead' || lifecycleBucket === 'in_progress') {
      currentProjectCount += 1;
    }
  }

  return {
    totalAmount: totalWonAmount.toFixed(2),
    maxProjectAmount: maxWonProjectAmount.toFixed(2),
    currentProjectCount,
  };
}

export async function syncSingleCustomerStats(customerId: number) {
  const [{ db }, schemaModule, drizzleOrm] = await Promise.all([
    import('@/db'),
    import('@/db/schema'),
    import('drizzle-orm'),
  ]);
  const { customers, projects } = schemaModule;
  const { and, eq, isNull, sql } = drizzleOrm;

  const projectRows = await db
    .select({
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      status: projects.status,
      amount: sql<string>`COALESCE(CAST(COALESCE(${projects.actualAmount}, ${projects.estimatedAmount}, 0) AS DECIMAL), 0)`,
    })
    .from(projects)
    .where(and(
      eq(projects.customerId, customerId),
      isNull(projects.deletedAt)
    ));

  const summary = summarizeCustomerProjectStats(projectRows);

  await db
    .update(customers)
    .set({
      totalAmount: summary.totalAmount,
      maxProjectAmount: summary.maxProjectAmount,
      currentProjectCount: summary.currentProjectCount,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  return {
    totalAmount: summary.totalAmount,
    maxProjectAmount: summary.maxProjectAmount,
    currentProjectCount: summary.currentProjectCount,
  };
}