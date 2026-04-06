import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { contracts, projects } from '@/db/schema';

export async function syncProjectContractSnapshot(projectId: number) {
  const [latestContract] = await db
    .select({
      contractAmount: contracts.contractAmount,
      signDate: contracts.signDate,
    })
    .from(contracts)
    .where(and(
      eq(contracts.projectId, projectId),
      isNull(contracts.deletedAt),
    ))
    .orderBy(
      desc(sql`COALESCE(${contracts.signDate}, DATE '0001-01-01')`),
      desc(contracts.updatedAt),
      desc(contracts.id),
    )
    .limit(1);

  await db
    .update(projects)
    .set({
      contractAmount: latestContract?.contractAmount ?? null,
      contractSignDate: latestContract?.signDate ?? null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
}

export async function syncProjectContractSnapshots(projectIds: Array<number | null | undefined>) {
  const uniqueProjectIds = [...new Set(projectIds.filter((projectId): projectId is number => Boolean(projectId)))];

  for (const projectId of uniqueProjectIds) {
    await syncProjectContractSnapshot(projectId);
  }
}