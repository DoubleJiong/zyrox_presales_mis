'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  onClick?: () => void;
}

/**
 * 浏览器推送通知 Hook
 * 封装了通知权限申请和推送功能
 */
export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>('default');

  // 检查浏览器是否支持通知
  const isSupported = useCallback(() => {
    return typeof window !== 'undefined' && 'Notification' in window;
  }, []);

  // 获取当前权限状态
  const getPermission = useCallback(() => {
    if (!isSupported()) return 'denied';
    return Notification.permission;
  }, [isSupported]);

  // 请求通知权限
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // 发送通知
  const sendNotification = useCallback(
    async (options: NotificationOptions): Promise<Notification | null> => {
      if (!isSupported()) return null;

      // 浏览器通知权限应由用户显式触发申请，不在后台流程中主动弹窗。
      if (Notification.permission !== 'granted') {
        permissionRef.current = Notification.permission;
        return null;
      }

      // 创建通知
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        requireInteraction: true,
      });

      // 点击事件
      if (options.onClick) {
        notification.onclick = () => {
          options.onClick?.();
          notification.close();
          // 聚焦窗口
          window.focus();
        };
      }

      return notification;
    },
    [isSupported]
  );

  // 发送待办提醒通知
  const sendTodoReminder = useCallback(
    (todoTitle: string, dueDate: string, todoId: number) => {
      return sendNotification({
        title: '待办到期提醒',
        body: `「${todoTitle}」将于 ${dueDate} 到期，请及时处理。`,
        tag: `todo-${todoId}`,
        data: { type: 'todo', id: todoId },
      });
    },
    [sendNotification]
  );

  // 发送日程提醒通知
  const sendScheduleReminder = useCallback(
    (scheduleTitle: string, startTime: string, location: string | null, scheduleId: number) => {
      const body = location
        ? `「${scheduleTitle}」将在 ${startTime} 开始，地点：${location}`
        : `「${scheduleTitle}」将在 ${startTime} 开始`;

      return sendNotification({
        title: '日程即将开始',
        body,
        tag: `schedule-${scheduleId}`,
        data: { type: 'schedule', id: scheduleId },
      });
    },
    [sendNotification]
  );

  // 发送系统通知
  const sendSystemNotification = useCallback(
    (title: string, message: string) => {
      return sendNotification({
        title,
        body: message,
        tag: 'system',
      });
    },
    [sendNotification]
  );

  return {
    isSupported,
    getPermission,
    requestPermission,
    sendNotification,
    sendTodoReminder,
    sendScheduleReminder,
    sendSystemNotification,
  };
}

/**
 * 浏览器通知组件
 * 用于初始化权限和后台检查提醒
 */
export function BrowserNotification() {
  const { user } = useAuth();
  const { isSupported, sendTodoReminder, sendScheduleReminder } = useBrowserNotification();
  const lastCheckRef = useRef<Date | null>(null);

  // 初始化时检查权限
  useEffect(() => {
    if (!isSupported() || !user) return;

    // 仅缓存当前权限，不在登录后输出 denied 噪音。
    lastCheckRef.current = new Date();
  }, [user, isSupported]);

  // 后台检查提醒（可选，用于触发浏览器通知）
  useEffect(() => {
    if (!user || !isSupported() || Notification.permission !== 'granted') {
      return;
    }

    const checkReminders = async () => {
      try {
        const response = await fetch(`/api/reminders/check?userId=${user.id}`);
        const result = await response.json();
        
        if (result.success && result.data.createdCount > 0) {
          // 有新提醒，发送浏览器通知
          for (const notification of result.data.notifications) {
            if (notification.title.includes('待办')) {
              sendTodoReminder(
                notification.content.match(/「(.+?)」/)?.[1] || '待办事项',
                '今天',
                notification.id
              );
            } else if (notification.title.includes('日程')) {
              sendScheduleReminder(
                notification.content.match(/「(.+?)」/)?.[1] || '日程',
                notification.content.match(/(\d+分钟)/)?.[1] || '即将',
                notification.content.match(/地点：(.+?)。/)?.[1] || null,
                notification.id
              );
            }
          }
        }
        
        lastCheckRef.current = new Date();
      } catch (error) {
        console.error('Failed to check reminders:', error);
      }
    };

    // 首次检查
    checkReminders();

    // 每5分钟检查一次
    const interval = setInterval(checkReminders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, isSupported, sendTodoReminder, sendScheduleReminder]);

  return null;
}
