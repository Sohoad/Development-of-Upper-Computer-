import { useState, useCallback } from 'react';
import { Switch, InputNumber, Button, Typography, Space, Modal, message } from 'antd';
import type { TagConfig, TagValue } from '@shared/types';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';
import { AnimatedValue } from '../common';
import PermissionGuard from '../common/PermissionGuard';

const { Text } = Typography;

interface TagControlItemProps {
  tag: TagConfig;
  tagValue: TagValue | undefined;
  disabled: boolean;
}

function TagControlItem({ tag, tagValue, disabled }: TagControlItemProps) {
  const { t } = useTranslation();
  const writeTag = usePLCStore((state) => state.writeTag);
  const [writeStatus, setWriteStatus] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [analogValue, setAnalogValue] = useState<number>(0);

  const currentValue = tagValue?.value;

  const flashClass =
    writeStatus === 'success'
      ? ' write-success'
      : writeStatus === 'error'
        ? ' write-error'
        : '';

  const clearFlash = useCallback(() => {
    setTimeout(() => {
      setWriteStatus(null);
      setErrorMsg('');
    }, 1500);
  }, []);

  const handleBoolToggle = useCallback(
    (checked: boolean) => {
      Modal.confirm({
        title: t('manual.toggleConfirmTitle'),
        content: t('manual.toggleConfirmMessage', {
          tag: tag.name,
          value: checked ? 'ON' : 'OFF',
        }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: async () => {
          try {
            await writeTag(tag.name, checked);
            setWriteStatus('success');
            clearFlash();
          } catch {
            setWriteStatus('error');
            setErrorMsg(t('manual.writeFail'));
            clearFlash();
          }
        },
      });
    },
    [tag.name, writeTag, t, clearFlash],
  );

  const handleAnalogWrite = useCallback(async () => {
    try {
      await writeTag(tag.name, analogValue);
      setWriteStatus('success');
      clearFlash();
    } catch {
      setWriteStatus('error');
      setErrorMsg(t('manual.writeFail'));
      clearFlash();
    }
  }, [tag.name, analogValue, writeTag, t, clearFlash]);

  const renderBoolControl = () => (
    <PermissionGuard requiredRole="engineer">
      <Switch
        checked={Boolean(currentValue)}
        checkedChildren="ON"
        unCheckedChildren="OFF"
        disabled={disabled}
        onChange={handleBoolToggle}
      />
    </PermissionGuard>
  );

  const renderAnalogControl = () => (
    <PermissionGuard requiredRole="engineer">
      <Space>
        <InputNumber
          value={analogValue}
          onChange={(v) => setAnalogValue(v ?? 0)}
          min={tag.min}
          max={tag.max}
          step={tag.type === 'real' ? 0.1 : 1}
          disabled={disabled}
          addonAfter={tag.unit}
          style={{ width: 150 }}
        />
        <Button
          type="primary"
          size="small"
          disabled={disabled}
          onClick={handleAnalogWrite}
        >
          {t('manual.write')}
        </Button>
      </Space>
    </PermissionGuard>
  );

  const isBool = tag.type === 'bool';

  return (
    <div
      className={`tag-control-item${flashClass}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background-color 0.3s',
        borderRadius: 4,
        paddingLeft: 8,
        paddingRight: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 14 }}>
            {tag.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {tag.address}
          </Text>
        </div>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('manual.currentValue')}：
          </Text>
          {currentValue != null ? (
            isBool ? (
              <Text
                style={{
                  color: currentValue ? '#52c41a' : '#8c8c8c',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {currentValue ? 'ON' : 'OFF'}
              </Text>
            ) : (
              <AnimatedValue
                value={Number(currentValue)}
                precision={tag.type === 'real' ? 1 : 0}
                prefix=""
                suffix={tag.unit ? ` ${tag.unit}` : ''}
                style={{ fontSize: 14, fontWeight: 600 }}
              />
            )
          ) : (
            <Text type="secondary">--</Text>
          )}
        </div>
        {writeStatus === 'error' && errorMsg && (
          <Text type="danger" style={{ fontSize: 11 }}>
            {errorMsg}
          </Text>
        )}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 16 }}>
        {isBool ? renderBoolControl() : renderAnalogControl()}
      </div>
    </div>
  );
}

export default TagControlItem;