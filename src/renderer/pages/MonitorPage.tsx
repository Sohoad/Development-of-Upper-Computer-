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
    <PageTransition direction="fade">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {t('monitor.title')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusIndicator status={statusIndicatorStatus} size={8} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>
              {connectionStatus.connected
                ? t('header.connected')
                : connectionStatus.simulation
                  ? `${t('header.connected')} (SIM)`
                  : t('header.disconnected')}
            </span>
            {connectionStatus.connected && (
              <Tag color="green" style={{ fontSize: 9, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                {connectionStatus.latency}ms
              </Tag>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <ParamPanel />
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 6, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
            <FurnaceVisualization />
          </div>
          <div style={{ width: 240, flexShrink: 0, overflow: 'hidden' }}>
            <GaugePanel />
          </div>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <RealTimeCurve />
          </div>
          <div style={{ width: 240, flexShrink: 0 }}>
            <AlarmBar />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default MonitorPage;