/**
 * 现代科技感主题配置 - 深度定制版
 * 专注于动态效果和视觉冲击力
 */

export interface TechTheme {
  // 背景色配置
  background: {
    primary: string;        // 主背景色
    secondary: string;      // 次背景色
    card: string;           // 卡片背景色
    gradient: string;       // 渐变背景
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
    glow: string;           // 发光边框
  };

  // 主题色（用于图表、按钮等）
  colors: {
    primary: string;        // 主色 - 霓虹蓝
    secondary: string;      // 次色 - 霓虹紫
    accent: string;         // 强调色 - 霓虹红
    success: string;        // 成功色 - 霓虹绿
    warning: string;        // 警告色 - 霓虹黄
    danger: string;         // 危险色 - 霓虹红
  };

  // 图表色阶
  chart: {
    colors: string[];       // 图表颜色序列
    lineColors: string[];   // 线条颜色
    areaColors: string[];   // 区域颜色
  };

  // 动画配置
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: string;
  };

  // 发光效果
  glow: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // 卡片样式
  card: {
    borderRadius: string;
    padding: string;
    border: string;
    boxShadow: string;
    boxShadowHover: string;
  };

  // 字体配置
  font: {
    size: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    weight: {
      normal: string;
      medium: string;
      bold: string;
    };
  };
}

// 现代科技感主题 - 深度定制
export const techTheme: TechTheme = {
  // 背景色 - 深色渐变
  background: {
    primary: '#0a0a0f',      // 接近纯黑
    secondary: '#12121a',    // 深灰蓝
    card: 'rgba(18, 18, 26, 0.8)',  // 半透明卡片
    gradient: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #1a1a2e 100%)',
  },

  // 文本色 - 高对比度白色
  text: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    muted: '#9ca3af',
  },

  // 边框 - 半透明白色
  border: {
    color: 'rgba(255, 255, 255, 0.1)',
    card: 'rgba(255, 255, 255, 0.08)',
    glow: 'rgba(59, 130, 246, 0.5)',
  },

  // 霓虹配色方案
  colors: {
    primary: '#00d4ff',      // 霓虹蓝 - 主色
    secondary: '#b24bf3',    // 霓虹紫 - 次色
    accent: '#ff006e',       // 霓虹红 - 强调
    success: '#00ff88',      // 霓虹绿 - 成功
    warning: '#ffcc00',      // 霓虹黄 - 警告
    danger: '#ff0055',       // 霓虹红 - 危险
  },

  // 图表色阶 - 渐变色阶
  chart: {
    colors: ['#00d4ff', '#00ff88', '#ffcc00', '#ff006e', '#b24bf3', '#ff0055'],
    lineColors: ['#00d4ff', '#b24bf3', '#ff006e', '#00ff88', '#ffcc00', '#ff0055'],
    areaColors: [
      'rgba(0, 212, 255, 0.3)',
      'rgba(178, 75, 243, 0.3)',
      'rgba(255, 0, 110, 0.3)',
      'rgba(0, 255, 136, 0.3)',
      'rgba(255, 204, 0, 0.3)',
      'rgba(255, 0, 85, 0.3)',
    ],
  },

  // 动画配置
  animation: {
    duration: {
      fast: '0.3s',
      normal: '0.6s',
      slow: '1s',
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // 发光效果 - 霓虹光晕
  glow: {
    primary: '0 0 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.4)',
    secondary: '0 0 20px rgba(178, 75, 243, 0.6), 0 0 40px rgba(178, 75, 243, 0.4)',
    accent: '0 0 20px rgba(255, 0, 110, 0.6), 0 0 40px rgba(255, 0, 110, 0.4)',
  },

  // 卡片样式 - 玻璃态+发光边框
  card: {
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    boxShadowHover: '0 8px 32px rgba(0, 212, 255, 0.2), 0 0 40px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  },

  // 字体配置
  font: {
    size: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '48px',
    },
    weight: {
      normal: '400',
      medium: '500',
      bold: '600',
    },
  },
};
