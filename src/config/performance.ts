/**
 * 性能优化配置
 * 定义关键资源、预加载策略等
 */

// =====================================================
// 关键资源配置
// =====================================================

// 关键CSS（需要内联到HTML）
export const CRITICAL_CSS = `
  /* 基础布局样式 */
  html { font-family: system-ui, -apple-system, sans-serif; }
  body { margin: 0; min-height: 100vh; }
  
  /* 骨架屏动画 */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  .skeleton {
    animation: shimmer 1.5s ease-in-out infinite;
    background: linear-gradient(90deg, 
      var(--muted) 25%, 
      var(--muted-foreground) 50%, 
      var(--muted) 75%
    );
    background-size: 200% 100%;
  }
  
  /* 首屏可见区域 */
  .above-fold {
    min-height: 100vh;
  }
`;

// 关键字体
export const CRITICAL_FONTS = [
  {
    family: 'Inter',
    url: '/fonts/inter-var.woff2',
    display: 'swap' as const,
    preload: true,
  },
];

// 关键图片（首屏）
export const CRITICAL_IMAGES = [
  '/images/logo.svg',
];

// =====================================================
// 路由预加载配置
// =====================================================

// 高优先级路由（用户最可能访问）
export const HIGH_PRIORITY_ROUTES = [
  '/dashboard',
  '/customers',
  '/projects',
];

// 中等优先级路由
export const MEDIUM_PRIORITY_ROUTES = [
  '/tasks',
  '/solutions',
  '/reports',
];

// 预加载延迟（毫秒）
export const PRELOAD_DELAYS = {
  high: 0,       // 立即预加载
  medium: 1000,  // 1秒后预加载
  low: 3000,     // 3秒后预加载
};

// =====================================================
// API缓存配置
// =====================================================

// 缓存时间配置（毫秒）
export const CACHE_TTL = {
  // 静态数据（很少变化）
  static: 24 * 60 * 60 * 1000,  // 24小时
  // 半静态数据（偶尔变化）
  semiStatic: 60 * 60 * 1000,   // 1小时
  // 动态数据（经常变化）
  dynamic: 5 * 60 * 1000,       // 5分钟
  // 实时数据
  realtime: 30 * 1000,          // 30秒
};

// API路由缓存配置
export const API_CACHE_CONFIG: Record<string, {
  ttl: number;
  cacheable: boolean;
  revalidate: boolean;
}> = {
  // 用户相关
  '/api/users': { ttl: CACHE_TTL.semiStatic, cacheable: true, revalidate: true },
  '/api/users/me': { ttl: CACHE_TTL.dynamic, cacheable: true, revalidate: true },
  
  // 客户相关
  '/api/customers': { ttl: CACHE_TTL.dynamic, cacheable: true, revalidate: true },
  '/api/customers/stats': { ttl: CACHE_TTL.dynamic, cacheable: true, revalidate: true },
  
  // 项目相关
  '/api/projects': { ttl: CACHE_TTL.dynamic, cacheable: true, revalidate: true },
  '/api/projects/stats': { ttl: CACHE_TTL.dynamic, cacheable: true, revalidate: true },
  
  // 解决方案（变化较少）
  '/api/solutions': { ttl: CACHE_TTL.semiStatic, cacheable: true, revalidate: true },
  
  // 仪表盘数据
  '/api/dashboard/stats': { ttl: CACHE_TTL.dynamic, cacheable: true, revalidate: true },
  '/api/dashboard/charts': { ttl: CACHE_TTL.dynamic, cacheable: true, revalidate: true },
  
  // 系统配置（静态）
  '/api/config': { ttl: CACHE_TTL.static, cacheable: true, revalidate: false },
  
  // 不缓存的接口
  '/api/auth': { ttl: 0, cacheable: false, revalidate: false },
  '/api/login': { ttl: 0, cacheable: false, revalidate: false },
};

// =====================================================
// 图片优化配置
// =====================================================

// 图片尺寸配置
export const IMAGE_SIZES = {
  avatar: { width: 64, height: 64 },
  thumbnail: { width: 200, height: 200 },
  card: { width: 400, height: 300 },
  banner: { width: 1200, height: 400 },
};

// 图片格式优先级
export const IMAGE_FORMATS = ['image/avif', 'image/webp', 'image/jpeg', 'image/png'];

// =====================================================
// 性能预算
// =====================================================

export const PERFORMANCE_BUDGETS = {
  // 最大资源大小
  maxBundleSize: 500 * 1024,        // 500KB
  maxImageSize: 200 * 1024,         // 200KB
  maxFontSize: 50 * 1024,           // 50KB
  
  // 最大加载时间
  maxFCP: 1800,                      // 首次内容绘制 (ms)
  maxLCP: 2500,                      // 最大内容绘制 (ms)
  maxTTI: 3800,                      // 可交互时间 (ms)
  maxTBT: 200,                       // 总阻塞时间 (ms)
  maxCLS: 0.1,                       // 累积布局偏移
  
  // 最大请求数
  maxRequests: {
    firstParty: 15,                  // 第一方请求
    thirdParty: 5,                   // 第三方请求
  },
};

// =====================================================
// 监控配置
// =====================================================

export const MONITORING_CONFIG = {
  // 是否启用性能监控
  enabled: process.env.NODE_ENV === 'production',
  
  // 采样率
  sampleRate: 0.1,  // 10%
  
  // 上报端点
  reportEndpoint: '/api/performance/report',
  
  // 需要监控的指标
  metrics: [
    'navigationTiming',
    'resourceTiming',
    'longTasks',
    'layoutShift',
    'interactionTiming',
  ],
  
  // 忽略的资源
  ignorePatterns: [
    /\/api\/health/,
    /\/api\/metrics/,
    /\/_next\/static/,
  ],
};

// =====================================================
// 懒加载配置
// =====================================================

export const LAZY_LOAD_CONFIG = {
  // 图片懒加载
  images: {
    rootMargin: '200px',
    threshold: 0.1,
  },
  
  // 组件懒加载
  components: {
    rootMargin: '100px',
    threshold: 0,
  },
  
  // 分页数据
  pagination: {
    pageSize: 10,
    prefetchPages: 1,  // 预加载下一页
  },
};

// =====================================================
// 防抖和节流配置
// =====================================================

export const DEBOUNCE_CONFIG = {
  // 搜索输入
  search: 300,
  
  // 窗口调整
  resize: 100,
  
  // 滚动事件
  scroll: 50,
  
  // 表单自动保存
  autoSave: 1000,
};

export const THROTTLE_CONFIG = {
  // 滚动加载
  infiniteScroll: 200,
  
  // API请求
  apiRequest: 100,
  
  // 动画帧
  animation: 16,  // ~60fps
};
