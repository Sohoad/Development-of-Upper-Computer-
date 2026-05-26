import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Modal, Button, Tag } from 'antd';
import {
  BellOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  AlertOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { usePLCStore } from '../../stores/plcStore';
import type { AlarmRecord } from '@shared/types';

const LEVEL_CONFIG: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
  warning: {
    color: '#d89614',
    icon: <WarningOutlined />,
    bg: 'rgba(216, 150, 20, 0.12)',
  },
  fault: {
    color: '#fa8c16',
    icon: <CloseCircleOutlined />,
    bg: 'rgba(250, 140, 22, 0.12)',
  },
  emergency: {
    color: '#d32029',
    icon: <AlertOutlined />,
    bg: 'rgba(211, 32, 41, 0.12)',
  },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function AlarmBar() {
  const { t } = useTranslation();
  const alarms = usePLCStore((s) => s.alarms);
  const connectionStatus = usePLCStore((s) => s.connectionStatus);
  const acknowledgeAlarm = usePLCStore((s) => s.acknowledgeAlarm);

  const [selectedAlarm, setSelectedAlarm] = useState<AlarmRecord | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [alarms]);

  const handleAcknowledge = useCallback(
    (alarmId: string) => {
      acknowledgeAlarm(alarmId);
      setSelectedAlarm((prev) => (prev?.id === alarmId ? { ...prev, acknowledged: true } : prev));
    },
    [acknowledgeAlarm]
  );

  const activeAlarms = alarms.filter((a) => !a.acknowledged);
  const isConnected = connectionStatus.connected;

  return (
    <>
      <div
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
height: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            borderBottom: '1px solid var(--color-border-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <BellOutlined style={{ fontSize: 11, color: activeAlarms.length > 0 ? '#d32029' : undefined }} />
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 10 }}>
              {t('monitor.alarms')}
            </span>
          </div>
          {activeAlarms.length > 0 && (
            <Badge
              count={activeAlarms.length}
              overflowCount={99}
              size="small"
              style={{ backgroundColor: '#d32029' }}
            />
          )}
        </div>

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2px 4px',
          }}
        >
          {!isConnected ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-sm)',
                gap: 8,
              }}
            >
              <CloseCircleOutlined style={{ fontSize: 24, color: '#d32029' }} />
              <span>PLC 连接失败</span>
              <span style={{ fontSize: 'var(--font-size-xs)' }}>{t('manual.notConnectedWarning')}</span>
            </div>
          ) : alarms.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 80,
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <CheckCircleOutlined style={{ marginRight: 6 }} />
              {t('common.noData')}
            </div>
          ) : (
            alarms.map((alarm) => {
              const cfg = LEVEL_CONFIG[alarm.level] ?? LEVEL_CONFIG.warning;
              return (
                <div
                  key={alarm.id}
                  onClick={() => setSelectedAlarm(alarm)}
                  className="card-hover"
                  style={{
                    padding: '3px 6px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: !alarm.acknowledged ? cfg.bg : undefined,
                    opacity: alarm.acknowledged ? 0.55 : 1,
                    marginBottom: 2,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 4,
                  }}
                >
                  <span style={{ color: cfg.color, marginTop: 1, fontSize: 10 }}>{cfg.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 8,
                        color: 'var(--color-text-tertiary)',
                        lineHeight: '12px',
                      }}
                    >
                      {formatTime(alarm.time)}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '14px',
                      }}
                    >
                      {alarm.description}
                    </div>
                    <div style={{ marginTop: 1 }}>
                      <Tag
                        color={
                          alarm.level === 'emergency'
                            ? 'red'
                            : alarm.level === 'fault'
                              ? 'orange'
                              : 'gold'
                        }
                        style={{ fontSize: 8, lineHeight: '14px', padding: '0 3px' }}
                      >
                        {t(`alarm.${alarm.level}`)}
                      </Tag>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedAlarm && LEVEL_CONFIG[selectedAlarm.level]?.icon}
            <span>{t('alarm.desc')}</span>
          </div>
        }
        open={selectedAlarm !== null}
        onCancel={() => setSelectedAlarm(null)}
        footer={
          selectedAlarm && !selectedAlarm.acknowledged
            ? [
                <Button key="cancel" onClick={() => setSelectedAlarm(null)}>
                  {t('common.cancel')}
                </Button>,
                <Button
                  key="ack"
                  type="primary"
                  onClick={() => {
                    handleAcknowledge(selectedAlarm.id);
                  }}
                >
                  {t('alarm.acknowledge')}
                </Button>,
              ]
            : [
                <Button key="close" type="primary" onClick={() => setSelectedAlarm(null)}>
                  {t('common.cancel')}
                </Button>,
              ]
        }
      >
        {selectedAlarm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>{t('alarm.level')}: </span>
              <Tag
                color={
                  selectedAlarm.level === 'emergency'
                    ? 'red'
                    : selectedAlarm.level === 'fault'
                      ? 'orange'
                      : 'gold'
                }
              >
                {t(`alarm.${selectedAlarm.level}`)}
              </Tag>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>{t('alarm.time')}: </span>
              <span>{new Date(selectedAlarm.time).toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>{t('alarm.desc')}: </span>
              <span>{selectedAlarm.description}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Tag: </span>
              <span>{selectedAlarm.tag}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Value: </span>
              <span>{String(selectedAlarm.value)}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>{t('common.status')}: </span>
              <Tag color={selectedAlarm.acknowledged ? 'green' : 'red'}>
                {selectedAlarm.acknowledged ? t('alarm.acknowledge') : 'Active'}
              </Tag>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default AlarmBar;