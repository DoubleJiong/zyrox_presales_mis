import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { customers, projects } from '@/db/schema';
import { sanitizePlainText } from '@/lib/input-sanitization';

export interface ProjectCustomerSnapshot {
  customerId: number | null;
  customerName: string | null;
}

export async function resolveProjectCustomerSnapshot(input: {
  customerId?: number | null;
  customerName?: string | null;
}): Promise<ProjectCustomerSnapshot> {
  const normalizedCustomerId = input.customerId ?? null;
  const normalizedCustomerName = input.customerName ? sanitizePlainText(input.customerName) : null;

  if (!normalizedCustomerId) {
    return {
      customerId: null,
      customerName: normalizedCustomerName,
    };
  }

  const [customer] = await db
    .select({
      id: customers.id,
      customerName: customers.customerName,
    })
    .from(customers)
    .where(and(eq(customers.id, normalizedCustomerId), isNull(customers.deletedAt)))
    .limit(1);

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  return {
    customerId: customer.id,
    customerName: customer.customerName,
  };
}

export async function syncProjectCustomerSnapshot(customerId: number, customerName: string) {
  await db
    .update(projects)
    .set({
      customerName,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.customerId, customerId), isNull(projects.deletedAt)));
}