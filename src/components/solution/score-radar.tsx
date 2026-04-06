/**
 * 方案评分雷达图组件
 * 
 * 功能：
 * - 可视化展示四维评分
 * - 纯SVG实现，无外部依赖
 */

'use client';

interface ScoreRadarProps {
  qualityScore: number;
  businessValueScore: number;
  userRecognitionScore: number;
  activityScore: number;
  size?: number;
}

export function ScoreRadar({
  qualityScore,
  businessValueScore,
  userRecognitionScore,
  activityScore,
  size = 200,
}: ScoreRadarProps) {
  // 雷达图中心和半径
  const center = size / 2;
  const radius = (size / 2) * 0.8; // 留出标签空间

  // 四个维度（顺时针：上、右、下、左）
  const dimensions = [
    { label: '质量', value: qualityScore, angle: -90 },   // 上
    { label: '商业价值', value: businessValueScore, angle: 0 },    // 右
    { label: '用户认可', value: userRecognitionScore, angle: 90 },  // 下
    { label: '活跃度', value: activityScore, angle: 180 }, // 左
  ];

  // 计算点坐标
  const getPoint = (angle: number, distance: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: center + distance * Math.cos(radian),
      y: center + distance * Math.sin(radian),
    };
  };

  // 生成多边形路径
  const getPolygonPath = (values: number[], scale: number = 1) => {
    return values
      .map((value, index) => {
        const angle = dimensions[index].angle;
        const distance = (value / 100) * radius * scale;
        const point = getPoint(angle, distance);
        return `${point.x},${point.y}`;
      })
      .join(' ');
  };

  // 生成网格线（20%, 40%, 60%, 80%, 100%）
  const gridLevels = [20, 40, 60, 80, 100];
  
  // 数据多边形
  const dataPoints = [
    qualityScore,
    businessValueScore,
    userRecognitionScore,
    activityScore,
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 背景网格 */}
      {gridLevels.map((level) => {
        const points = getPolygonPath([level, level, level, level]);
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.2)"
            strokeWidth="1"
          />
        );
      })}

      {/* 轴线 */}
      {dimensions.map((dim, index) => {
        const endPoint = getPoint(dim.angle, radius);
        return (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={endPoint.x}
            y2={endPoint.y}
            stroke="hsl(var(--muted-foreground) / 0.3)"
            strokeWidth="1"
          />
        );
      })}

      {/* 数据多边形 */}
      <polygon
        points={getPolygonPath(dataPoints)}
        fill="hsl(var(--primary) / 0.2)"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 数据点 */}
      {dimensions.map((dim, index) => {
        const distance = (dataPoints[index] / 100) * radius;
        const point = getPoint(dim.angle, distance);
        return (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth="2"
          />
        );
      })}

      {/* 维度标签 */}
      {dimensions.map((dim, index) => {
        const labelDistance = radius + 20;
        const point = getPoint(dim.angle, labelDistance);
        return (
          <g key={index}>
            <text
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-foreground"
            >
              {dim.label}
            </text>
            <text
              x={point.x}
              y={point.y + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-muted-foreground"
            >
              {dataPoints[index].toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* 中心点 */}
      <circle cx={center} cy={center} r="3" fill="hsl(var(--primary))" />
    </svg>
  );
}
