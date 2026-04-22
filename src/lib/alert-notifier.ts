/**
 * Alert Notifier — Phase 2
 *
 * Handles delivery of alert notifications to recipients.
 *
 * in_app : Writes bus_alert_notification rows (status='pending').
 *          The workbench inbox (read-model.ts) queries alertNotifications
 *          joined with alertHistories to build the feed automatically —
 *          no separate sys_message write needed.
 *
 * sms    : Stub only — not configured. Still records a failed delivery row
 *          in bus_alert_notification for auditability.
 *
 * email  : Excluded from Phase 2 scope.
 */

import { db } from '@/db';
import { alertNotifications } from '@/db/schema';

export interface NotifyResult {
  sent: boolean;
  channel: string;
  reason?: string;
}

export const alertNotifier = {
  /**
   * Write in-app notification rows for each recipient.
   *
   * status='pending' aligns with the workbench read-model filter
   * (eq(alertNotifications.status, 'pending')).
   * The notification stays 'pending' until the UI layer marks it handled
   * when the user acknowledges / resolves the alert (Phase 4).
   */
  async notifyInApp(
    alertHistoryId: number,
    recipientIds: number[],
    content: string,
  ): Promise<void> {
    if (recipientIds.length === 0) return;

    await db.insert(alertNotifications).values(
      recipientIds.map((recipientId) => ({
        alertHistoryId,
        recipientId,
        channel: 'in_app' as const,
        status: 'pending' as const,
        content,
      })),
    );
  },

  /**
   * SMS delivery stub.
   *
   * Records a failed delivery row per recipient for auditability,
   * then returns without attempting any real send.
   */
  async notifySms(
    alertHistoryId: number,
    recipientIds: number[],
    content: string,
  ): Promise<NotifyResult> {
    if (recipientIds.length > 0) {
      await db.insert(alertNotifications).values(
        recipientIds.map((recipientId) => ({
          alertHistoryId,
          recipientId,
          channel: 'sms' as const,
          status: 'failed' as const,
          content,
          errorMessage: 'SMS channel not configured',
        })),
      );
    }
    console.log('[alert-notifier] SMS channel not configured, skipping delivery');
    return { sent: false, channel: 'sms', reason: 'not_configured' };
  },
};
