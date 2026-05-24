import { useEffect } from 'react';
import { Typography, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { PageTransition, StatusIndicator } from '../components/common';
import { usePLCStore } from '../stores/plcStore';
import FurnaceVisualization from '../components/monitor/FurnaceVisualization';
import ParamPanel from '../components/monitor/ParamPanel';
import GaugePanel from '../components/monitor/GaugePanel';
import AlarmBar from '../components/monitor/AlarmBar';
import RealTimeCurve from '../components/monitor/RealTimeCurve';

const { Title } = Typography;

function MonitorPage() {
  const { t } = useTranslation();
  const connectionStatus = usePLCStore((s) => s.connectionStatus);
  const initListeners = usePLCStore((s) => s.initListeners);
  const destroyListeners = usePLCStore((s) => s.destroyListeners);

  useEffect(() => {
    initListeners();
    return () => {
      destroyListeners();
    };
  }, [initListeners, destroyListeners]);

  const statusIndicatorStatus =
    connectionStatus.connected
      ? 'connected'
      : connectionStatus.simulation
        ? 'warning'
        : 'disconnected';

  return (
    <PageTransition direction="slide-up">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          gap: 'var(--space-md)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            {t('monitor.title')}
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <StatusIndicator status={statusIndicatorStatus} size={8} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {connectionStatus.connected
                ? t('header.connected')
                : connectionStatus.simulation
                  ? `${t('header.connected')} (SIM)`
                  : t('header.disconnected')}
            </span>
            {connectionStatus.connected && (
              <Tag color="green" style={{ fontSize: 'var(--font-size-xs)' }}>
                {connectionStatus.latency}ms
              </Tag>
            )}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 'var(--space-md)',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flex: '1 1 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <ParamPanel />
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                gap: 'var(--space-md)',
                minHeight: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  padding: 'var(--space-lg)',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <FurnaceVisualization />
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <RealTimeCurve />
            </div>

            <div style={{ flexShrink: 0 }}>
              <GaugePanel />
            </div>
          </div>

          <div
            style={{
              width: 280,
              flexShrink: 0,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <AlarmBar />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default MonitorPage;