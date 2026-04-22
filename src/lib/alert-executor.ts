/**
 * Alert Executor �?Phase 2 rewrite
 *
 * Two entry points:
 *  1. executeThresholdRule(ruleId)  �?called by pg-boss cron worker (wired in Phase 3)
 *  2. executeSignalAlert(data)      �?called by pg-boss signal worker (wired in Phase 3)
 *
 * Strict mode (Plan A): only processes rules where sceneTemplate IS NOT NULL.
 * Legacy rules using ruleType + ruleCategory are silently ignored.
 *
 * Dedup guard: skips creating a new alert if a 'pending' or 'acknowledged' alert
 * already exists for the same ruleId + targetId.
 *
 * Auto-close: on each threshold scan, existing open alerts whose targets no longer
 * satisfy the condition are set to 'auto_closed'.
 */

import { db } from '@/db';
import { alertRules, alertHistories, projects, customers, messages } from '@/db/schema';
import {
  eq, and, lt, lte, gte, isNull, isNotNull, inArray, or, sql,
} from 'drizzle-orm';

import { OPEN_PROJECT_LIFECYCLE_STAGES } from '@/lib/project-reporting';
import { alertNotifier } from '@/lib/alert-notifier';

// ── Sequence self-heal ────────────────────────────────────────

async function resetAlertHistoryIdSequence() {
  await db.execute(sql.raw(`
    SELECT setval(
      pg_get_serial_sequence('bus_alert_history', 'id'),
      COALESCE((SELECT MAX(id) FROM bus_alert_history), 0) + 1,
      false
    )
  `));
}

function isAlertHistorySequenceDriftError(error: unknown) {
  const dbError = error as { cause?: { code?: string; constraint_name?: string } };
  return dbError?.cause?.code === '23505' &&
    dbError?.cause?.constraint_name === 'bus_alert_history_pkey';
}

// ── Types ─────────────────────────────────────────────────────

type AlertRule = typeof alertRules.$inferSelect;

/** Payload put into the 'alert-signal' pg-boss job by business write paths (Phase 3). */
export interface SignalAlertJobData {
  sceneTemplate: string;
  targetId: number;
  targetType: string;
  targetName: string;
  alertData?: Record<string, unknown>;
}

/** Internal representation of one matched target for a threshold rule. */
interface TriggeredTarget {
  name: string;
  targetType: string;
  message: string;
  alertData: Record<string, unknown>;
}

// Statuses that mean "this alert still needs human attention"
const OPEN_STATUSES = ['pending', 'acknowledged'] as const;

// ── Utilities ─────────────────────────────────────────────────

/** Convert (value, unit) to a number of calendar days. */
function toDays(value: number, unit: string): number {
  if (unit === 'week') return value * 7;
  if (unit === 'month') return value * 30;
  return value; // 'day' or anything unrecognised
}

function buildContent(ruleName: string, targetName: string, message: string): string {
  return `【预警�?{ruleName} �?${targetName}�?{message}`;
}

// ── Executor ──────────────────────────────────────────────────

export class AlertExecutor {
  // ╔══════════════════════════════════════════════════════════╗
  // �? Threshold entry point                                   �?  // ╚══════════════════════════════════════════════════════════╝

  /**
   * Execute one threshold rule by id.
   * Called per-rule by a pg-boss cron worker (registered in Phase 3).
   *
   * Strict mode: silently returns if the rule has no sceneTemplate.
   */
  async executeThresholdRule(ruleId: number): Promise<void> {
    const [rule] = await db
      .select()
      .from(alertRules)
      .where(
        and(
          eq(alertRules.id, ruleId),
          eq(alertRules.status, 'active'),
          isNull(alertRules.deletedAt),
        ),
      )
      .limit(1);

    if (!rule?.sceneTemplate || rule.triggerType !== 'threshold') return;

    // 1. Which targets currently satisfy the trigger condition?
    const triggered = await this.fetchTriggeredTargets(rule);

    // 2. All currently-open alerts for this rule
    const openAlerts = await db
      .select({ id: alertHistories.id, targetId: alertHistories.targetId })
      .from(alertHistories)
      .where(
        and(
          eq(alertHistories.ruleId, rule.id),
          inArray(alertHistories.status, [...OPEN_STATUSES]),
          isNull(alertHistories.deletedAt),
        ),
      );

    const triggeredIds = new Set([...triggered.keys()]);
    const openByTarget = new Map(
      openAlerts
        .filter((a): a is typeof a & { targetId: number } => a.targetId != null)
        .map((a) => [a.targetId, a.id]),
    );

    // 3. Auto-close alerts whose condition is no longer met
    for (const [targetId, alertId] of openByTarget) {
      if (!triggeredIds.has(targetId)) {
        await db
          .update(alertHistories)
          .set({
            status: 'auto_closed',
            autoClosedAt: new Date(),
            autoClosedReason: `检查条件已解除（场景：${rule.sceneTemplate}），系统自动关闭`,
            updatedAt: new Date(),
          })
          .where(eq(alertHistories.id, alertId));
      }
    }

    // 4. Create new alerts for newly-triggered targets (dedup: skip if open alert exists)
    let newCount = 0;
    for (const [targetId, target] of triggered) {
      if (openByTarget.has(targetId)) continue;

      const insertValues = {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          alertType: rule.sceneTemplate,
          targetType: target.targetType,
          targetId,
          targetName: target.name,
          severity: rule.severity,
          status: 'pending' as const,
          message: target.message,
          alertData: target.alertData,
        };

      let created: typeof alertHistories.$inferSelect;
      try {
        [created] = await db
          .insert(alertHistories)
          .values(insertValues)
          .returning();
      } catch (insertErr) {
        if (!isAlertHistorySequenceDriftError(insertErr)) throw insertErr;
        await resetAlertHistoryIdSequence();
        [created] = await db
          .insert(alertHistories)
          .values(insertValues)
          .returning();
      }

      await alertNotifier.notifyInApp(
        created.id,
        rule.recipientIds ?? [],
        buildContent(rule.ruleName, target.name, target.message),
      );

      // 将预警同步写入 sys_message，使消息中心可展示预警类消息
      const alertRecipients = rule.recipientIds ?? [];
      if (alertRecipients.length > 0) {
        try {
          const alertContent = buildContent(rule.ruleName, target.name, target.message);
          const alertPriority =
            rule.severity === 'critical' ? 'urgent'
            : rule.severity === 'high' ? 'high'
            : rule.severity === 'medium' ? 'normal' : 'low';
          await db.insert(messages).values(
            alertRecipients.map((receiverId) => ({
              title: `预警触发：${rule.ruleName}`,
              content: alertContent,
              type: 'alert' as const,
              category: 'project',
              priority: alertPriority as 'urgent' | 'high' | 'normal' | 'low',
              receiverId,
              relatedType: target.targetType,
              relatedId: targetId,
              relatedName: target.name,
              actionUrl: '/alerts/histories?status=pending',
              actionText: '查看预警',
              isRead: false,
              isDeleted: false,
              updatedAt: new Date(),
            }))
          );
        } catch (msgErr) {
          console.error('[alert-executor] Failed to write sys_message for threshold alert:', msgErr);
        }
      }

      newCount++;
    }

    // 5. Update rule stats
    if (newCount > 0) {
      await db
        .update(alertRules)
        .set({
          lastTriggeredAt: new Date(),
          triggerCount: sql`${alertRules.triggerCount} + ${newCount}`,
          updatedAt: new Date(),
        })
        .where(eq(alertRules.id, rule.id));
    }
  }

  // ╔══════════════════════════════════════════════════════════╗
  // �? Signal entry point                                      �?  // ╚══════════════════════════════════════════════════════════╝

  /**
   * Execute a signal alert for a given business event.
   * Called by the pg-boss 'alert-signal' worker (registered in Phase 3).
   *
   * Finds every active signal rule whose sceneTemplate matches the event,
   * then creates one alert per rule (dedup: skips if open alert already exists
   * for the same ruleId + targetId).
   */
  async executeSignalAlert(data: SignalAlertJobData): Promise<void> {
    const matchingRules = await db
      .select()
      .from(alertRules)
      .where(
        and(
          eq(alertRules.sceneTemplate, data.sceneTemplate),
          eq(alertRules.triggerType, 'signal'),
          eq(alertRules.status, 'active'),
          isNull(alertRules.deletedAt),
        ),
      );

    for (const rule of matchingRules) {
      // Dedup guard
      const [existing] = await db
        .select({ id: alertHistories.id })
        .from(alertHistories)
        .where(
          and(
            eq(alertHistories.ruleId, rule.id),
            eq(alertHistories.targetId, data.targetId),
            inArray(alertHistories.status, [...OPEN_STATUSES]),
            isNull(alertHistories.deletedAt),
          ),
        )
        .limit(1);

      if (existing) continue;

      const message =
        (data.alertData?.message as string | undefined) ??
        `${data.targetName} 触发�?${rule.ruleName} 预警`;

      const signalInsertValues = {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          alertType: rule.sceneTemplate,
          targetType: data.targetType,
          targetId: data.targetId,
          targetName: data.targetName,
          severity: rule.severity,
          status: 'pending' as const,
          message,
          alertData: data.alertData ?? {},
        };

      let created: typeof alertHistories.$inferSelect;
      try {
        [created] = await db
          .insert(alertHistories)
          .values(signalInsertValues)
          .returning();
      } catch (insertErr) {
        if (!isAlertHistorySequenceDriftError(insertErr)) throw insertErr;
        await resetAlertHistoryIdSequence();
        [created] = await db
          .insert(alertHistories)
          .values(signalInsertValues)
          .returning();
      }

      await alertNotifier.notifyInApp(
        created.id,
        rule.recipientIds ?? [],
        buildContent(rule.ruleName, data.targetName, message),
      );

      // 将预警同步写入 sys_message
      const signalRecipients = rule.recipientIds ?? [];
      if (signalRecipients.length > 0) {
        try {
          const signalContent = buildContent(rule.ruleName, data.targetName, message);
          const signalPriority =
            rule.severity === 'critical' ? 'urgent'
            : rule.severity === 'high' ? 'high'
            : rule.severity === 'medium' ? 'normal' : 'low';
          await db.insert(messages).values(
            signalRecipients.map((receiverId) => ({
              title: `预警触发：${rule.ruleName}`,
              content: signalContent,
              type: 'alert' as const,
              category: 'project',
              priority: signalPriority as 'urgent' | 'high' | 'normal' | 'low',
              receiverId,
              relatedType: data.targetType,
              relatedId: data.targetId,
              relatedName: data.targetName,
              actionUrl: '/alerts/histories?status=pending',
              actionText: '查看预警',
              isRead: false,
              isDeleted: false,
              updatedAt: new Date(),
            }))
          );
        } catch (msgErr) {
          console.error('[alert-executor] Failed to write sys_message for signal alert:', msgErr);
        }
      }

      await db
        .update(alertRules)
        .set({
          lastTriggeredAt: new Date(),
          triggerCount: sql`${alertRules.triggerCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(alertRules.id, rule.id));
    }
  }

  // ╔══════════════════════════════════════════════════════════╗
  // �? Template implementations                                �?  // ╚══════════════════════════════════════════════════════════╝

  private async fetchTriggeredTargets(
    rule: AlertRule,
  ): Promise<Map<number, TriggeredTarget>> {
    switch (rule.sceneTemplate) {
      case 'project_not_updated':
        return this.tplProjectNotUpdated(rule);
      case 'project_overdue':
        return this.tplProjectOverdue(rule);
      case 'project_near_deadline':
        return this.tplProjectNearDeadline(rule);
      case 'customer_inactive':
        return this.tplCustomerInactive(rule);
      default:
        console.warn(`[alert-executor] Unknown sceneTemplate: ${rule.sceneTemplate}`);
        return new Map();
    }
  }

  // ── template: project_not_updated ────────────────────────────
  // Condition: updatedAt < now �?N days  AND  stage is open
  private async tplProjectNotUpdated(
    rule: AlertRule,
  ): Promise<Map<number, TriggeredTarget>> {
    const days = toDays(rule.thresholdValue, rule.thresholdUnit);
    const cutoff = new Date(Date.now() - days * 86_400_000);

    const rows = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        updatedAt: projects.updatedAt,
        projectStage: projects.projectStage,
      })
      .from(projects)
      .where(
        and(
          isNull(projects.deletedAt),
          inArray(projects.projectStage, [...OPEN_PROJECT_LIFECYCLE_STAGES]),
          lt(projects.updatedAt, cutoff),
        ),
      );

    const result = new Map<number, TriggeredTarget>();
    for (const row of rows) {
      const daysSince = Math.floor((Date.now() - row.updatedAt.getTime()) / 86_400_000);
      result.set(row.id, {
        name: row.projectName,
        targetType: 'project',
        message: `项目已超�?${daysSince} 天未更新（阈值：${days} 天）`,
        alertData: {
          daysSinceUpdate: daysSince,
          thresholdDays: days,
          projectStage: row.projectStage,
          lastUpdated: row.updatedAt.toISOString(),
        },
      });
    }
    return result;
  }

  // ── template: project_overdue ────────────────────────────────
  // Condition: expectedDeliveryDate < today  AND  stage is open
  private async tplProjectOverdue(
    rule: AlertRule,
  ): Promise<Map<number, TriggeredTarget>> {
    // rule.thresholdValue is unused for this template (overdue = delivery date passed at all)
    void rule;
    const todayStr = new Date().toISOString().split('T')[0];

    const rows = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        expectedDeliveryDate: projects.expectedDeliveryDate,
        projectStage: projects.projectStage,
      })
      .from(projects)
      .where(
        and(
          isNull(projects.deletedAt),
          isNotNull(projects.expectedDeliveryDate),
          inArray(projects.projectStage, [...OPEN_PROJECT_LIFECYCLE_STAGES]),
          lt(projects.expectedDeliveryDate, todayStr),
        ),
      );

    const result = new Map<number, TriggeredTarget>();
    for (const row of rows) {
      const deliveryDate = new Date(row.expectedDeliveryDate!);
      const daysOverdue = Math.floor((Date.now() - deliveryDate.getTime()) / 86_400_000);
      result.set(row.id, {
        name: row.projectName,
        targetType: 'project',
        message: `项目已超�?${daysOverdue} 天（预期交付日：${row.expectedDeliveryDate}）`,
        alertData: {
          daysOverdue,
          expectedDeliveryDate: row.expectedDeliveryDate,
          projectStage: row.projectStage,
        },
      });
    }
    return result;
  }

  // ── template: project_near_deadline ─────────────────────────
  // Condition: today �?expectedDeliveryDate �?today + N days  AND  stage is open
  private async tplProjectNearDeadline(
    rule: AlertRule,
  ): Promise<Map<number, TriggeredTarget>> {
    const days = toDays(rule.thresholdValue, rule.thresholdUnit);
    const todayStr = new Date().toISOString().split('T')[0];
    const upperStr = new Date(Date.now() + days * 86_400_000).toISOString().split('T')[0];

    const rows = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        expectedDeliveryDate: projects.expectedDeliveryDate,
        projectStage: projects.projectStage,
      })
      .from(projects)
      .where(
        and(
          isNull(projects.deletedAt),
          isNotNull(projects.expectedDeliveryDate),
          inArray(projects.projectStage, [...OPEN_PROJECT_LIFECYCLE_STAGES]),
          gte(projects.expectedDeliveryDate, todayStr),   // not yet overdue
          lte(projects.expectedDeliveryDate, upperStr),   // within N days
        ),
      );

    const result = new Map<number, TriggeredTarget>();
    for (const row of rows) {
      const deliveryDate = new Date(row.expectedDeliveryDate!);
      const daysRemaining = Math.ceil((deliveryDate.getTime() - Date.now()) / 86_400_000);
      result.set(row.id, {
        name: row.projectName,
        targetType: 'project',
        message: `项目距截止日期还�?${daysRemaining} 天（截止日：${row.expectedDeliveryDate}）`,
        alertData: {
          daysRemaining,
          thresholdDays: days,
          expectedDeliveryDate: row.expectedDeliveryDate,
          projectStage: row.projectStage,
        },
      });
    }
    return result;
  }

  // ── template: customer_inactive ──────────────────────────────
  // Condition: lastInteractionTime < now �?N days
  //            (or: lastInteractionTime IS NULL AND createdAt < now �?N days)
  //            AND status = 'active'
  private async tplCustomerInactive(
    rule: AlertRule,
  ): Promise<Map<number, TriggeredTarget>> {
    const days = toDays(rule.thresholdValue, rule.thresholdUnit);
    const cutoff = new Date(Date.now() - days * 86_400_000);

    const rows = await db
      .select({
        id: customers.id,
        customerName: customers.customerName,
        lastInteractionTime: customers.lastInteractionTime,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(
        and(
          isNull(customers.deletedAt),
          eq(customers.status, 'active'),
          or(
            and(
              isNull(customers.lastInteractionTime),
              lt(customers.createdAt, cutoff),
            ),
            lt(customers.lastInteractionTime, cutoff),
          ),
        ),
      );

    const result = new Map<number, TriggeredTarget>();
    for (const row of rows) {
      const lastTime = row.lastInteractionTime ?? row.createdAt;
      const daysSince = Math.floor((Date.now() - lastTime.getTime()) / 86_400_000);
      result.set(row.id, {
        name: row.customerName,
        targetType: 'customer',
        message: `客户已超�?${daysSince} 天未跟进（阈值：${days} 天）`,
        alertData: {
          daysSinceLastInteraction: daysSince,
          thresholdDays: days,
          lastInteractionTime: row.lastInteractionTime?.toISOString() ?? null,
        },
      });
    }
    return result;
  }
}

// 导出单例
export const alertExecutor = new AlertExecutor();
