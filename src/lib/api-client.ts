/**
 * 带性能追踪的API客户端
 * 自动记录所有API请求的时间并上报
 * 自动添加Authorization header
 */

import { perf } from './performance-monitor';

interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean; // 跳过自动添加认证头
}

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * 从localStorage获取token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * 带性能追踪的 fetch 封装
 * 自动添加Authorization header
 */
export async function fetchWithPerformance<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, skipAuth = false, ...fetchOptions } = options;
  const method = fetchOptions.method || 'GET';
  const startTime = performance.now();

  // 自动添加Authorization header
  const token = getAuthToken();
  const headers = new Headers(fetchOptions.headers);
  
  if (token && !skipAuth) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    const duration = performance.now() - startTime;
    
    // 记录性能指标
    perf.recordApi(url, method, duration, response.status);

    // 解析响应
    let data: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as T;
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  } catch (error: any) {
    const duration = performance.now() - startTime;
    
    // 记录失败请求
    perf.recordApi(url, method, duration, error.status || 0);

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 带性能追踪的 API 客户端
 */
export const apiClient = {
  get<T = unknown>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithPerformance<T>(url, { ...options, method: 'GET' });
  },

  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    // 如果 body 是 FormData，不设置 Content-Type，让浏览器自动处理
    const isFormData = body instanceof FormData;
    
    return fetchWithPerformance<T>(url, {
      ...options,
      method: 'POST',
      headers: isFormData 
        ? options?.headers 
        : {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      body: isFormData ? (body as BodyInit) : (body ? JSON.stringify(body) : undefined),
    });
  },

  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithPerformance<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithPerformance<T>(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = unknown>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithPerformance<T>(url, { ...options, method: 'DELETE' });
  },
};

/**
 * 使用示例:
 * 
 * // GET 请求
 * const { data, status } = await apiClient.get<UserData>('/api/users/1');
 * 
 * // POST 请求
 * const { data } = await apiClient.post<Response>('/api/users', { name: 'John' });
 * 
 * // 带自定义配置
 * const { data } = await apiClient.get('/api/data', {
 *   headers: { 'Authorization': 'Bearer token' },
 *   timeout: 5000,
 * });
 */

export default apiClient;
