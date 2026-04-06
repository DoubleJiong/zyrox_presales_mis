/**
 * 预警规则执行器
 * 负责检查预警规则并生成预警记录
 */

import { db } from '@/db';
import { alertRules, alertHistories, alertNotifications, projects, customers, users } from '@/db/schema';
import { eq, and, gt, lt, isNull, isNotNull, sql, inArray } from 'drizzle-orm';

import { OPEN_PROJECT_LIFECYCLE_STAGES } from '@/lib/project-reporting';

// =====================================================
// 类型定义
// =====================================================

export interface AlertRuleCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: number | string;
  unit?: 'day' | 'hour' | 'week' | 'month' | 'count';
}

export interface AlertExecutionContext {
  ruleId: number;
  ruleName: string;
  ruleCode: string;
  ruleType: string;
  severity: string;
  notificationChannels: string[];
  recipientIds: number[];
}

export interface AlertResult {
  triggered: boolean;
  targetId: number;
  targetName: string;
  currentValue: any;
  thresholdValue: any;
  condition: string;
}

// =====================================================
// 预警规则执行器
// =====================================================

export class AlertExecutor {
  /**
   * 执行所有活跃的预警规则
   */
  async executeAllRules(): Promise<{
    rulesChecked: number;
    alertsCreated: number;
    results: Array<{ ruleId: number; ruleName: string; alertsCreated: number }>;
  }> {
    // 获取所有活跃的预警规则
    const activeRules = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.status, 'active'), isNull(alertRules.deletedAt)));

    const results: Array<{ ruleId: number; ruleName: string; alertsCreated: number }> = [];
    let totalAlertsCreated = 0;

    for (const rule of activeRules) {
      try {
        const alertsCreated = await this.executeRule(rule);
        results.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          alertsCreated: alertsCreated.length,
        });
        totalAlertsCreated += alertsCreated.length;

        // 更新规则触发次数
        if (alertsCreated.length > 0) {
          await db
            .update(alertRules)
            .set({
              lastTriggeredAt: new Date(),
              triggerCount: sql`${alertRules.triggerCount} + ${alertsCreated.length}`,
              updatedAt: new Date(),
            })
            .where(eq(alertRules.id, rule.id));
        }
      } catch (error) {
        console.error(`执行预警规则 ${rule.ruleName} 失败:`, error);
      }
    }

    return {
      rulesChecked: activeRules.length,
      alertsCreated: totalAlertsCreated,
      results,
    };
  }

  /**
   * 执行单个预警规则
   */
  async executeRule(rule: typeof alertRules.$inferSelect): Promise<Array<typeof alertHistories.$inferSelect>> {
    switch (rule.ruleType) {
      case 'project':
        return this.executeProjectRule(rule);
      case 'customer':
        return this.executeCustomerRule(rule);
      case 'user':
        return this.executeUserRule(rule);
      case 'opportunity':
        return this.executeOpportunityRule(rule);
      default:
        console.warn(`未知的预警规则类型: ${rule.ruleType}`);
        return [];
    }
  }

  /**
   * 执行项目相关预警规则
   */
  private async executeProjectRule(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    const alerts: Array<typeof alertHistories.$inferSelect> = [];

    // 根据规则分类执行不同的检查逻辑
    switch (rule.ruleCategory) {
      case 'not_updated':
        // 项目长期未更新
        alerts.push(...(await this.checkProjectNotUpdated(rule)));
        break;
      case 'overdue':
        // 项目超期未交付
        alerts.push(...(await this.checkProjectOverdue(rule)));
        break;
      case 'inactive':
        // 项目长期无活动
        alerts.push(...(await this.checkProjectInactive(rule)));
        break;
      default:
        console.warn(`未知的项目预警分类: ${rule.ruleCategory}`);
    }

    return alerts;
  }

  /**
   * 检查项目长期未更新
   */
  private async checkProjectNotUpdated(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    const daysThreshold = rule.thresholdValue;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // 查询长期未更新的项目（排除已完成和已取消的项目）
    const staleProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          lt(projects.updatedAt, thresholdDate),
          isNull(projects.deletedAt),
          inArray(projects.projectStage, OPEN_PROJECT_LIFECYCLE_STAGES)
        )
      );

    const alerts: Array<typeof alertHistories.$inferSelect> = [];

    for (const project of staleProjects) {
      // 检查是否已存在相同项目的未处理预警
      const existingAlert = await db
        .select()
        .from(alertHistories)
        .where(
          and(
            eq(alertHistories.ruleId, rule.id),
            eq(alertHistories.targetId, project.id),
            eq(alertHistories.status, 'pending'),
            isNull(alertHistories.deletedAt)
          )
        )
        .limit(1);

      if (existingAlert.length > 0) continue;

      // 创建预警记录
      const daysSinceUpdate = Math.floor(
        (Date.now() - project.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const [alert] = await db
        .insert(alertHistories)
        .values({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          targetType: 'project',
          targetId: project.id,
          targetName: project.projectName,
          severity: rule.severity,
          status: 'pending',
          alertData: {
            condition: `${rule.conditionField} > ${rule.thresholdValue} ${rule.thresholdUnit}`,
            currentValue: `${daysSinceUpdate} days ago`,
            thresholdValue: rule.thresholdValue,
            thresholdUnit: rule.thresholdUnit,
            projectStage: project.projectStage,
            projectStatus: project.status,
            lastUpdated: project.updatedAt.toISOString(),
          },
        })
        .returning();

      alerts.push(alert);

      // 创建预警通知
      await this.createNotifications(alert, rule);
    }

    return alerts;
  }

  /**
   * 检查项目超期未交付
   */
  private async checkProjectOverdue(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    const daysThreshold = rule.thresholdValue;
    const thresholdDate = new Date();
    thresholdDate.setHours(0, 0, 0, 0);
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    const thresholdDateString = thresholdDate.toISOString().split('T')[0];

    // 查询超期未交付的项目
    const overdueProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          isNotNull(projects.expectedDeliveryDate),
          lt(projects.expectedDeliveryDate, thresholdDateString),
          inArray(projects.projectStage, OPEN_PROJECT_LIFECYCLE_STAGES),
          isNull(projects.deletedAt)
        )
      );

    const alerts: Array<typeof alertHistories.$inferSelect> = [];

    for (const project of overdueProjects) {
      // 检查是否已存在相同项目的未处理预警
      const existingAlert = await db
        .select()
        .from(alertHistories)
        .where(
          and(
            eq(alertHistories.ruleId, rule.id),
            eq(alertHistories.targetId, project.id),
            eq(alertHistories.status, 'pending'),
            isNull(alertHistories.deletedAt)
          )
        )
        .limit(1);

      if (existingAlert.length > 0) continue;

      // 计算超期天数
      const deliveryDate = new Date(project.expectedDeliveryDate!);
      const daysOverdue = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

      // 创建预警记录
      const [alert] = await db
        .insert(alertHistories)
        .values({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          targetType: 'project',
          targetId: project.id,
          targetName: project.projectName,
          severity: rule.severity,
          status: 'pending',
          alertData: {
            condition: `expected_delivery_date < NOW() - ${rule.thresholdValue} ${rule.thresholdUnit}`,
            currentValue: `${daysOverdue} days overdue`,
            thresholdValue: rule.thresholdValue,
            thresholdUnit: rule.thresholdUnit,
            projectStage: project.projectStage,
            projectStatus: project.status,
            expectedDeliveryDate: project.expectedDeliveryDate,
          },
        })
        .returning();

      alerts.push(alert);

      // 创建预警通知
      await this.createNotifications(alert, rule);
    }

    return alerts;
  }

  /**
   * 检查项目长期无活动
   */
  private async checkProjectInactive(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    // TODO: 实现项目长期无活动检查逻辑
    return [];
  }

  /**
   * 执行客户相关预警规则
   */
  private async executeCustomerRule(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    const alerts: Array<typeof alertHistories.$inferSelect> = [];

    switch (rule.ruleCategory) {
      case 'inactive':
        // 客户长期未跟进
        alerts.push(...(await this.checkCustomerInactive(rule)));
        break;
      case 'not_updated':
        // 客户信息长期未更新
        alerts.push(...(await this.checkCustomerNotUpdated(rule)));
        break;
      default:
        console.warn(`未知的客户预警分类: ${rule.ruleCategory}`);
    }

    return alerts;
  }

  /**
   * 检查客户长期未跟进
   */
  private async checkCustomerInactive(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    const daysThreshold = rule.thresholdValue;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // 查询长期未跟进的客户
    const inactiveCustomersResult = await db.execute(sql`
      SELECT c.*, 
             MAX(sa.activity_date) as last_activity_date
      FROM ${customers} c
      LEFT JOIN bus_staff_activity sa ON c.id = sa.customer_id AND sa.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
        AND c.status = 'active'
      GROUP BY c.id
      HAVING MAX(sa.activity_date) IS NULL 
         OR MAX(sa.activity_date) < ${thresholdDate.toISOString().split('T')[0]}
    `);

    const alerts: Array<typeof alertHistories.$inferSelect> = [];

    // 处理结果 - Drizzle 返回的直接是数组
    const inactiveCustomers = Array.isArray(inactiveCustomersResult) 
      ? inactiveCustomersResult 
      : (inactiveCustomersResult as any).rows || [];

    for (const customer of inactiveCustomers) {
      // 检查是否已存在相同客户的未处理预警
      const existingAlert = await db
        .select()
        .from(alertHistories)
        .where(
          and(
            eq(alertHistories.ruleId, rule.id),
            eq(alertHistories.targetId, customer.id),
            eq(alertHistories.status, 'pending'),
            isNull(alertHistories.deletedAt)
          )
        )
        .limit(1);

      if (existingAlert.length > 0) continue;

      // 计算未跟进天数
      const lastActivityDate = customer.last_activity_date
        ? new Date(customer.last_activity_date)
        : customer.created_at
          ? new Date(customer.created_at)
          : new Date();
      const daysSinceActivity = Math.floor(
        (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 创建预警记录
      const [alert] = await db
        .insert(alertHistories)
        .values({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          targetType: 'customer',
          targetId: customer.id,
          targetName: customer.customer_name,
          severity: rule.severity,
          status: 'pending',
          alertData: {
            condition: `last_activity_date > ${rule.thresholdValue} ${rule.thresholdUnit}`,
            currentValue: `${daysSinceActivity} days since last activity`,
            thresholdValue: rule.thresholdValue,
            thresholdUnit: rule.thresholdUnit,
            lastActivityDate: customer.last_activity_date || 'never',
          },
        })
        .returning();

      alerts.push(alert);

      // 创建预警通知
      await this.createNotifications(alert, rule);
    }

    return alerts;
  }

  /**
   * 检查客户信息长期未更新
   */
  private async checkCustomerNotUpdated(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    // TODO: 实现客户信息长期未更新检查逻辑
    return [];
  }

  /**
   * 执行用户相关预警规则
   */
  private async executeUserRule(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    // TODO: 实现用户相关预警规则
    return [];
  }

  /**
   * 执行商机相关预警规则
   */
  private async executeOpportunityRule(
    rule: typeof alertRules.$inferSelect
  ): Promise<Array<typeof alertHistories.$inferSelect>> {
    // TODO: 实现商机相关预警规则
    return [];
  }

  /**
   * 创建预警通知
   */
  private async createNotifications(
    alert: typeof alertHistories.$inferSelect,
    rule: typeof alertRules.$inferSelect
  ): Promise<void> {
    const recipientIds = rule.recipientIds || [];

    if (recipientIds.length === 0) return;

    const channels = rule.notificationChannels || ['system'];
    const notifications: Array<typeof alertNotifications.$inferSelect> = [];

    for (const recipientId of recipientIds) {
      for (const channel of channels) {
        const content = this.generateNotificationContent(alert, channel);

        const [notification] = await db
          .insert(alertNotifications)
          .values({
            alertHistoryId: alert.id,
            recipientId,
            channel,
            status: 'pending',
            content,
          })
          .returning();

        notifications.push(notification);
      }
    }

    // 尝试发送通知
    await this.sendNotifications(notifications);
  }

  /**
   * 生成通知内容
   */
  private generateNotificationContent(
    alert: typeof alertHistories.$inferSelect,
    channel: string
  ): string {
    const alertData = alert.alertData as any;

    switch (channel) {
      case 'email':
        return `【预警通知】${alert.ruleName}\n\n目标: ${alert.targetName}\n严重程度: ${alert.severity}\n当前状态: ${alertData?.currentValue || '未知'}\n\n请及时处理。`;
      case 'sms':
        return `【预警】${alert.ruleName} - ${alert.targetName}，严重程度: ${alert.severity}`;
      case 'system':
      default:
        return `${alert.ruleName}: ${alert.targetName} (${alert.severity})`;
    }
  }

  /**
   * 发送通知
   */
  private async sendNotifications(
    notifications: Array<typeof alertNotifications.$inferSelect>
  ): Promise<void> {
    for (const notification of notifications) {
      try {
        // 这里可以集成实际的发送逻辑
        // 例如：邮件服务、短信服务、系统消息推送等
        // 目前先标记为已发送
        await db
          .update(alertNotifications)
          .set({
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(alertNotifications.id, notification.id));
      } catch (error) {
        console.error(`发送通知失败 (ID: ${notification.id}):`, error);
        await db
          .update(alertNotifications)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(alertNotifications.id, notification.id));
      }
    }
  }
}

// 导出单例
export const alertExecutor = new AlertExecutor();
