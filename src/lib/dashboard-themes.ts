/**
 * 数据大屏主题配置
 * 支持4种风格：现代简约深色、浅色商务、现代科技感、极简高管
 */

export type ThemeType = 'modern-dark' | 'light-business' | 'tech-glass' | 'minimal-executive';

export interface DashboardTheme {
  id: ThemeType;
  name: string;
  description: string;

  // 背景色配置
  background: {
    primary: string;        // 主背景色
    secondary: string;      // 次背景色
    card: string;           // 卡片背景色
    gradient?: string;      // 渐变背景（可选）
  };

  // 文本色配置
  text: {
    primary: string;        // 主文本色
    secondary: string;      // 次文本色
    muted: string;          // 弱化文本色
  };

  // 边框和分割线
  border: {
    color: string;          // 边框颜色
    card: string;           // 卡片边框
  };

  // 主题色（用于图表、按钮等）
  colors: {
    primary: string;        // 主色
    secondary: string;      // 次色
    accent: string;         // 强调色
    success: string;        // 成功色
    warning: string;        // 警告色
    danger: string;         // 危险色
  };

  // 图表色阶
  chart: {
    colors: string[];       // 图表颜色序列
    glow?: boolean;         // 是否发光
  };

  // 卡片样式
  card: {
    borderRadius: string;   // 圆角大小
    shadow: string;         // 阴影
    padding: string;        // 内边距
    glassEffect?: boolean;  // 玻璃态效果
  };

  // 字体配置
  font: {
    size: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    weight: {
      normal: string;
      medium: string;
      bold: string;
    };
  };

  // 动画效果
  animation: {
    enabled: boolean;       // 是否启用动画
    speed: string;          // 动画速度
  };
}

// 风格1：现代简约深色风格
export const modernDarkTheme: DashboardTheme = {
  id: 'modern-dark',
  name: '现代简约深色',
  description: '深蓝灰色调，卡片式布局，强调可读性',
  background: {
    primary: '#0f172a',      // slate-900
    secondary: '#1e293b',    // slate-800
    card: '#1e293b',         // slate-800
  },
  text: {
    primary: '#f1f5f9',      // slate-100
    secondary: '#cbd5e1',    // slate-300
    muted: '#64748b',        // slate-500
  },
  border: {
    color: '#334155',        // slate-700
    card: '#334155',         // slate-700
  },
  colors: {
    primary: '#3b82f6',      // blue-500
    secondary: '#8b5cf6',    // violet-500
    accent: '#06b6d4',       // cyan-500
    success: '#10b981',      // emerald-500
    warning: '#f59e0b',      // amber-500
    danger: '#ef4444',       // red-500
  },
  chart: {
    colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
    glow: false,
  },
  card: {
    borderRadius: '0.75rem',  // 12px
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    padding: '1rem',
  },
  font: {
    size: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.5rem',    // 24px
    },
    weight: {
      normal: '400',
      medium: '500',
      bold: '600',
    },
  },
  animation: {
    enabled: true,
    speed: '0.3s',
  },
};

// 风格2：浅色商务风格
export const lightBusinessTheme: DashboardTheme = {
  id: 'light-business',
  name: '浅色商务',
  description: '白色背景，网格布局，清爽专业',
  background: {
    primary: '#f8fafc',      // slate-50
    secondary: '#ffffff',    // white
    card: '#ffffff',         // white
  },
  text: {
    primary: '#0f172a',      // slate-900
    secondary: '#475569',    // slate-600
    muted: '#94a3b8',        // slate-400
  },
  border: {
    color: '#e2e8f0',        // slate-200
    card: '#e2e8f0',         // slate-200
  },
  colors: {
    primary: '#3b82f6',      // blue-500
    secondary: '#22c55e',    // green-500
    accent: '#f97316',       // orange-500
    success: '#10b981',      // emerald-500
    warning: '#f59e0b',      // amber-500
    danger: '#ef4444',       // red-500
  },
  chart: {
    colors: ['#3b82f6', '#22c55e', '#f97316', '#10b981', '#f59e0b', '#ef4444'],
    glow: false,
  },
  card: {
    borderRadius: '0.5rem',   // 8px
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    padding: '1rem',
  },
  font: {
    size: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.5rem',    // 24px
    },
    weight: {
      normal: '400',
      medium: '500',
      bold: '600',
    },
  },
  animation: {
    enabled: true,
    speed: '0.2s',
  },
};

// 风格3：现代科技感风格
export const techGlassTheme: DashboardTheme = {
  id: 'tech-glass',
  name: '现代科技感',
  description: '深色渐变，玻璃态卡片，科技感十足',
  background: {
    primary: '#0f0c29',
    secondary: '#302b63',
    card: 'rgba(255, 255, 255, 0.05)',
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    muted: '#a0a0a0',
  },
  border: {
    color: 'rgba(255, 255, 255, 0.1)',
    card: 'rgba(255, 255, 255, 0.15)',
  },
  colors: {
    primary: '#00d4ff',      // 霓虹蓝
    secondary: '#b24bf3',    // 霓虹紫
    accent: '#ff006e',       // 霓虹红
    success: '#00ff88',      // 霓虹绿
    warning: '#ffcc00',      // 霓虹黄
    danger: '#ff0055',       // 霓虹红
  },
  chart: {
    colors: ['#00d4ff', '#b24bf3', '#ff006e', '#00ff88', '#ffcc00', '#ff0055'],
    glow: true,
  },
  card: {
    borderRadius: '1rem',    // 16px
    shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: '1.25rem',
    glassEffect: true,
  },
  font: {
    size: {
      xs: '0.875rem',  // 14px
      sm: '1rem',      // 16px
      md: '1.125rem',  // 18px
      lg: '1.25rem',   // 20px
      xl: '1.75rem',   // 28px
    },
    weight: {
      normal: '400',
      medium: '500',
      bold: '600',
    },
  },
  animation: {
    enabled: true,
    speed: '0.4s',
  },
};

// 风格4：极简高管风格
export const minimalExecutiveTheme: DashboardTheme = {
  id: 'minimal-executive',
  name: '极简高管',
  description: '纯净背景，大量留白，单色调配色',
  background: {
    primary: '#0a0a0a',      // 纯黑
    secondary: '#141414',    // 深灰
    card: '#141414',         // 深灰
  },
  text: {
    primary: '#ffffff',
    secondary: '#b3b3b3',
    muted: '#666666',
  },
  border: {
    color: '#262626',
    card: '#262626',
  },
  colors: {
    primary: '#00bcd4',      // 青色
    secondary: '#0097a7',    // 深青色
    accent: '#00838f',
    success: '#00bcd4',
    warning: '#0097a7',
    danger: '#e53935',
  },
  chart: {
    colors: ['#00bcd4', '#0097a7', '#00838f', '#006064', '#4dd0e1', '#26c6da'],
    glow: false,
  },
  card: {
    borderRadius: '0.25rem', // 4px - 最小圆角
    shadow: 'none',
    padding: '0.75rem',
  },
  font: {
    size: {
      xs: '0.8125rem', // 13px
      sm: '0.9375rem', // 15px
      md: '1.0625rem', // 17px
      lg: '1.1875rem', // 19px
      xl: '1.625rem',  // 26px
    },
    weight: {
      normal: '300',
      medium: '400',
      bold: '500',
    },
  },
  animation: {
    enabled: false,          // 极简风格关闭动画
    speed: '0.1s',
  },
};

// 主题映射
export const themes: Record<ThemeType, DashboardTheme> = {
  'modern-dark': modernDarkTheme,
  'light-business': lightBusinessTheme,
  'tech-glass': techGlassTheme,
  'minimal-executive': minimalExecutiveTheme,
};

// 默认主题
export const defaultTheme: ThemeType = 'modern-dark';
