'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

/**
 * 实时事件类型
 */
export interface RealtimeEvent {
  id: string;
  type: 'notification' | 'alert' | 'task_assigned' | 'message' | 'system' | 'project_update' | 'customer_update';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, any>;
  createdAt: string;
  read?: boolean;
}

/**
 * SSE 连接状态
 */
export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * SSE Hook 配置
 */
interface UseSSEOptions {
  /** 是否自动连接（默认 true） */
  autoConnect?: boolean;
  /** 重连间隔（毫秒，默认 3000） */
  reconnectInterval?: number;
  /** 最大重连次数（默认 5） */
  maxReconnectAttempts?: number;
  /** 收到消息时的回调 */
  onMessage?: (event: RealtimeEvent) => void;
  /** 连接状态变化时的回调 */
  onStatusChange?: (status: SSEConnectionStatus) => void;
  /** 错误回调 */
  onError?: (error: { code: string; message: string }) => void;
}

/**
 * SSE Hook 返回值
 */
interface UseSSEReturn {
  /** 当前连接状态 */
  status: SSEConnectionStatus;
  /** 最后收到的事件 */
  lastEvent: RealtimeEvent | null;
  /** 所有收到的事件（最近 100 条） */
  events: RealtimeEvent[];
  /** 手动连接 */
  connect: () => void;
  /** 手动断开 */
  disconnect: () => void;
  /** 清空事件列表 */
  clearEvents: () => void;
  /** 重连次数 */
  reconnectCount: number;
}

/**
 * SSE 错误类型
 */
interface SSEError {
  error: string;
  code: string;
  timestamp: string;
}

/**
 * 实时消息推送 Hook
 * 使用 Server-Sent Events (SSE) 接收实时消息
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onStatusChange,
    onError,
  } = options;

  const { isAuthenticated, token } = useAuth();
  const [status, setStatus] = useState<SSEConnectionStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [reconnectCount, setReconnectCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef(status);
  const eventsRef = useRef(events);
  const shouldReconnectRef = useRef(true);
  const reconnectCountRef = useRef(0);
  
  // 使用 ref 存储回调，避免依赖变化导致的重连
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onStatusChangeRef = useRef(onStatusChange);

  // 更新 ref
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onStatusChangeRef.current = onStatusChange;
  });

  // 保持 ref 同步
  useEffect(() => {
    statusRef.current = status;
    onStatusChangeRef.current?.(status);
  }, [status]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  /**
   * 处理消息
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: RealtimeEvent = JSON.parse(event.data);

      // 忽略心跳消息
      if (data.type === 'system' && data.title === 'heartbeat') {
        return;
      }

      // 忽略欢迎消息
      if (data.type === 'system' && data.title === '连接成功') {
        return;
      }

      // 更新状态
      setLastEvent(data);
      setEvents(prev => {
        const newEvents = [data, ...prev];
        // 保留最近 100 条
        return newEvents.slice(0, 100);
      });

      // 重置重连计数
      reconnectCountRef.current = 0;
      setReconnectCount(0);

      // 调用回调（使用 ref）
      onMessageRef.current?.(data);
    } catch (error) {
      console.warn('[SSE] Error parsing message:', error);
    }
  }, []);

  /**
   * 处理服务端发送的错误事件
   * 注意：这个处理器只处理服务器主动发送的 'error' 类型事件
   * EventSource 的连接错误由 onerror 处理
   */
  const handleServerError = useCallback((event: MessageEvent) => {
    try {
      // 检查 data 是否有效
      if (!event.data || event.data === 'undefined' || event.data.trim() === '') {
        // 这是连接级别的错误，不是服务端发送的错误事件，忽略
        // 连接错误由 onerror 处理
        return;
      }
      
      const error: SSEError = JSON.parse(event.data);
      console.warn(`[SSE] Server error: ${error.code} - ${error.error}`);
      
      // 认证相关错误，不需要重连
      if (error.code === 'UNAUTHORIZED' || error.code === 'TOKEN_EXPIRED') {
        shouldReconnectRef.current = false;
        setStatus('error');
        onErrorRef.current?.({ code: error.code, message: error.error });
        
        // 关闭连接
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }
    } catch (e) {
      // JSON 解析失败，可能是连接级别的错误，忽略
      // 连接错误由 onerror 处理
    }
  }, []);

  /**
   * 建立连接
   */
  const connect = useCallback(() => {
    // 如果已连接或正在连接，跳过
    if (eventSourceRef.current || statusRef.current === 'connecting') {
      return;
    }

    // 检查认证状态
    if (!isAuthenticated || !token) {
      console.log('[SSE] Not authenticated, skipping connection');
      return;
    }

    // 清理之前的重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 重置重连标志
    shouldReconnectRef.current = true;
    setStatus('connecting');

    try {
      // 创建 SSE 连接
      const url = '/api/events';
      console.log('[SSE] Creating EventSource with URL:', url, 'at:', new Date().toISOString());
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // 连接打开
      eventSource.onopen = () => {
        console.log('[SSE] Connected - readyState:', eventSource.readyState, 'url:', eventSource.url);
        setStatus('connected');
        reconnectCountRef.current = 0;
        setReconnectCount(0);
      };

      // 收到消息
      eventSource.onmessage = handleMessage;

      // 连接错误
      eventSource.onerror = () => {
        // 检查是否是正常关闭
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[SSE] Connection closed');
          
          // 如果不应重连，直接返回
          if (!shouldReconnectRef.current) {
            setStatus('disconnected');
            return;
          }
        }
        
        // 只有在连接确实断开的情况下才进行重连
        // 如果 readyState 是 CONNECTING，说明正在自动重连，不需要手动处理
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('[SSE] Reconnecting...');
          return;
        }
        
        setStatus('error');

        // 关闭当前连接
        eventSource.close();
        eventSourceRef.current = null;

        // 尝试重连
        if (shouldReconnectRef.current && reconnectCountRef.current < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(1.5, reconnectCountRef.current);
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current += 1;
            setReconnectCount(reconnectCountRef.current);
            connect();
          }, delay);
        } else if (!shouldReconnectRef.current) {
          setStatus('disconnected');
        } else {
          console.log('[SSE] Max reconnect attempts reached');
          setStatus('disconnected');
        }
      };

      // 处理服务端确认连接事件
      eventSource.addEventListener('connected', (event: MessageEvent) => {
        console.log('[SSE] Server confirmed connection:', event.data);
      });

      // 处理服务端错误事件
      eventSource.addEventListener('error', handleServerError);

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      setStatus('error');
    }
  }, [isAuthenticated, token, maxReconnectAttempts, reconnectInterval, handleMessage, handleServerError]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    // 标记不再重连
    shouldReconnectRef.current = false;

    // 清理重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 关闭 EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus('disconnected');
    reconnectCountRef.current = 0;
    setReconnectCount(0);
  }, []);

  /**
   * 清空事件列表
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  /**
   * 自动连接/断开
   */
  useEffect(() => {
    if (autoConnect && isAuthenticated && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, token, connect, disconnect]);

  /**
   * 页面可见性变化时重连
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          statusRef.current === 'disconnected' && 
          isAuthenticated && 
          token &&
          shouldReconnectRef.current) {
        console.log('[SSE] Page visible, reconnecting...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, token, connect]);

  return {
    status,
    lastEvent,
    events,
    connect,
    disconnect,
    clearEvents,
    reconnectCount,
  };
}

/**
 * 实时通知 Hook
 * 封装了通知相关的功能
 */
export function useRealtimeNotifications(onNotification?: (event: RealtimeEvent) => void): {
  notifications: RealtimeEvent[];
  unreadCount: number;
  status: SSEConnectionStatus;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
} {
  const [notifications, setNotifications] = useState<RealtimeEvent[]>([]);

  const handleMessage = useCallback((event: RealtimeEvent) => {
    // 只处理通知相关的事件
    const notificationTypes = ['notification', 'alert', 'task_assigned', 'message', 'system', 'project_update', 'customer_update'];
    
    if (notificationTypes.includes(event.type)) {
      setNotifications(prev => [event, ...prev]);
      onNotification?.(event);
    }
  }, [onNotification]);

  const { status } = useSSE({
    autoConnect: true,
    onMessage: handleMessage,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return {
    notifications,
    unreadCount,
    status,
    markAsRead,
    markAllAsRead,
  };
}
