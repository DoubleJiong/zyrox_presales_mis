'use client';

import { useState, useEffect } from 'react';
import { techTheme } from '@/lib/tech-theme';
import { AnimatedNumber } from './AnimatedNumber';
import { MapRegionData, AlertInfo } from '@/lib/map-types';
import { AlertTriangle, Users, FolderKanban, DollarSign, X } from 'lucide-react';

interface RegionDetailPanelProps {
  data: MapRegionData | null;
  visible: boolean;
  onClose: () => void;
}

export function RegionDetailPanel({ data, visible, onClose }: RegionDetailPanelProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
    }
  }, [visible]);

  if (!visible || !data) return null;

  const panelStyle = {
    position: 'fixed' as const,
    right: isAnimating ? '20px' : '-400px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '380px',
    backgroundColor: `${techTheme.background.card}95`,
    border: `1px solid ${techTheme.colors.primary}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: `0 0 40px ${techTheme.colors.primary}40`,
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    transition: `right ${techTheme.animation.duration.normal} ${techTheme.animation.easing}`,
  };

  const hasAlert = data.hasCustomerAlert || data.hasProjectAlert;

  return (
    <>
      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translate(0, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(0, -50%) scale(1); }
        }
      `}</style>

      <div style={panelStyle}>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute' as const,
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: `1px solid ${techTheme.border.color}`,
            color: techTheme.text.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `all ${techTheme.animation.duration.fast}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${techTheme.colors.danger}30`;
            e.currentTarget.style.borderColor = techTheme.colors.danger;
            e.currentTarget.style.color = techTheme.colors.danger;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = techTheme.border.color;
            e.currentTarget.style.color = techTheme.text.muted;
          }}
        >
          <X size={16} />
        </button>

        {/* 标题 */}
        <div
          style={{
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: `1px solid ${techTheme.border.color}`,
          }}
        >
          <h3
            style={{
              color: techTheme.text.primary,
              fontSize: techTheme.font.size.xl,
              fontWeight: techTheme.font.weight.bold,
              marginBottom: '4px',
            }}
          >
            {data.name}
          </h3>
          <p
            style={{
              color: techTheme.text.muted,
              fontSize: techTheme.font.size.sm,
            }}
          >
            区域详细信息
          </p>
        </div>

        {/* 数据卡片 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          {/* 客户数 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: `${techTheme.colors.primary}15`,
              border: `1px solid ${techTheme.colors.primary}40`,
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${techTheme.colors.primary}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={24} style={{ color: techTheme.colors.primary }} />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  color: techTheme.text.secondary,
                  fontSize: techTheme.font.size.sm,
                  marginBottom: '4px',
                }}
              >
                客户数量
              </p>
              <p
                style={{
                  color: techTheme.text.primary,
                  fontSize: techTheme.font.size['2xl'],
                  fontWeight: techTheme.font.weight.bold,
                }}
              >
                <AnimatedNumber value={data.customerCount} duration={1000} />
              </p>
            </div>
          </div>

          {/* 项目数 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: `${techTheme.colors.secondary}15`,
              border: `1px solid ${techTheme.colors.secondary}40`,
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${techTheme.colors.secondary}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderKanban size={24} style={{ color: techTheme.colors.secondary }} />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  color: techTheme.text.secondary,
                  fontSize: techTheme.font.size.sm,
                  marginBottom: '4px',
                }}
              >
                项目数量
              </p>
              <p
                style={{
                  color: techTheme.text.primary,
                  fontSize: techTheme.font.size['2xl'],
                  fontWeight: techTheme.font.weight.bold,
                }}
              >
                <AnimatedNumber value={data.projectCount} duration={1000} />
              </p>
            </div>
          </div>

          {/* 项目金额 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: `${techTheme.colors.success}15`,
              border: `1px solid ${techTheme.colors.success}40`,
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${techTheme.colors.success}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={24} style={{ color: techTheme.colors.success }} />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  color: techTheme.text.secondary,
                  fontSize: techTheme.font.size.sm,
                  marginBottom: '4px',
                }}
              >
                项目总额
              </p>
              <p
                style={{
                  color: techTheme.text.primary,
                  fontSize: techTheme.font.size['2xl'],
                  fontWeight: techTheme.font.weight.bold,
                }}
              >
                <AnimatedNumber value={data.projectAmount} duration={1000} suffix=" 万" />
              </p>
            </div>
          </div>
        </div>

        {/* 预警信息 */}
        {hasAlert && data.alertInfo && data.alertInfo.length > 0 && (
          <div>
            <h4
              style={{
                color: techTheme.colors.danger,
                fontSize: techTheme.font.size.md,
                fontWeight: techTheme.font.weight.bold,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={18} />
              预警信息 ({data.alertInfo.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.alertInfo.map((alert, index) => {
                const alertColor = alert.level === 'high' ? techTheme.colors.danger : techTheme.colors.warning;
                return (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      backgroundColor: `${alertColor}15`,
                      border: `1px solid ${alertColor}40`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <AlertTriangle
                      size={18}
                      style={{
                        color: alertColor,
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          color: techTheme.text.primary,
                          fontSize: techTheme.font.size.sm,
                          fontWeight: techTheme.font.weight.medium,
                          marginBottom: '4px',
                        }}
                      >
                        {alert.message}
                      </p>
                      <p
                        style={{
                          color: alertColor,
                          fontSize: techTheme.font.size.xs,
                          fontWeight: techTheme.font.weight.bold,
                        }}
                      >
                        {alert.level === 'high' ? '严重' : '重要'} · {alert.type === 'customer' ? '客户' : '项目'}预警
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasAlert && (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: techTheme.text.muted,
              fontSize: techTheme.font.size.sm,
              border: `1px dashed ${techTheme.border.color}`,
              borderRadius: '8px',
            }}
          >
            <AlertTriangle size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <p>暂无预警信息</p>
          </div>
        )}
      </div>
    </>
  );
}
