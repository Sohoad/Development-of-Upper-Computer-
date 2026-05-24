import { useState, useEffect } from 'react';
import {
  Typography,
  Tabs,
  Form,
  Input,
  InputNumber,
  Button,
  Switch,
  Select,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Descriptions,
  App,
  Spin,
} from 'antd';
import {
  ApiOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  NodeIndexOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { PageTransition } from '../components/common';
import { usePLCStore } from '../stores/plcStore';
import { useAuthStore } from '../stores/authStore';
import { useThemeContext } from '../contexts/ThemeContext';
import type { TagMapping, TagConfig } from '@shared/types';

const { Title, Text } = Typography;

interface AppInfo {
  version: string;
  platform: string;
  nodeVersion: string;
  electronVersion: string;
}

const MAPPING_FIELDS: { key: keyof TagMapping; labelKey: string; unit: string }[] = [
  { key: 'monitorTemperature', labelKey: 'monitor.temperature', unit: '°C' },
  { key: 'monitorPressure', labelKey: 'monitor.pressure', unit: 'Pa' },
  { key: 'monitorPower', labelKey: 'monitor.power', unit: 'kW' },
  { key: 'monitorCurrent', labelKey: 'monitor.current', unit: 'A' },
  { key: 'monitorVoltage', labelKey: 'monitor.voltage', unit: 'V' },
  { key: 'monitorFlowRate', labelKey: 'monitor.flowRate', unit: 'L/min' },
  { key: 'monitorFrequency', labelKey: 'monitor.frequency', unit: 'Hz' },
  { key: 'monitorStatusCode', labelKey: 'monitor.statusCode', unit: '' },
];

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { message, modal } = App.useApp();
  const connectionStatus = usePLCStore((s) => s.connectionStatus);
  const connect = usePLCStore((s) => s.connect);
  const disconnect = usePLCStore((s) => s.disconnect);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { themeMode, toggleTheme } = useThemeContext();

  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [appInfoLoading, setAppInfoLoading] = useState(true);
  const [sysParamsLoading, setSysParamsLoading] = useState(true);
  const [mappingLoading, setMappingLoading] = useState(true);

  const [plcForm] = Form.useForm();
  const [sysForm] = Form.useForm();
  const [mappingForm] = Form.useForm();

  const [availableTags, setAvailableTags] = useState<TagConfig[]>([]);
  const [currentMappings, setCurrentMappings] = useState<TagMapping | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI
        .getAppInfo()
        .then((info) => setAppInfo(info))
        .finally(() => setAppInfoLoading(false));
    } else {
      setAppInfoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.settings
        .get()
        .then((settings) => {
          sysForm.setFieldsValue({
            pollInterval: settings.pollInterval,
            historySaveInterval: settings.historySaveInterval,
            alarmCheckEnabled: settings.alarmCheckEnabled,
          });
        })
        .finally(() => setSysParamsLoading(false));
    } else {
      setSysParamsLoading(false);
    }
  }, [sysForm]);

  useEffect(() => {
    loadMappingData();
  }, []);

  const loadMappingData = async () => {
    setMappingLoading(true);
    try {
      if (window.electronAPI) {
        const [settings, tags] = await Promise.all([
          window.electronAPI.settings.get(),
          window.electronAPI.plc.getTags().catch(() => [] as TagConfig[]),
        ]);
        setAvailableTags(tags);
        const mappings = settings.tagMappings || {
          monitorTemperature: 'furnace.temp_zone2',
          monitorPressure: 'furnace.pressure',
          monitorPower: 'furnace.power',
          monitorCurrent: 'furnace.current',
          monitorVoltage: 'furnace.voltage',
          monitorFlowRate: 'furnace.flow_rate',
          monitorFrequency: 'furnace.frequency',
          monitorStatusCode: 'furnace.status_code',
        };
        setCurrentMappings(mappings);
        mappingForm.setFieldsValue(mappings);
      }
    } catch (err) {
      console.error('[Settings] load mapping error:', err);
    } finally {
      setMappingLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const values = await plcForm.validateFields();
      await connect({ ip: values.ip, rack: values.rack, slot: values.slot });
      message.success('PLC 连接请求已发送');
    } catch {
      // validation error
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    message.info('PLC 已断开');
  };

  const handleSavePlcConfig = async () => {
    try {
      const values = await plcForm.validateFields();
      const config = { ip: values.ip, rack: values.rack, slot: values.slot };
      if (window.electronAPI) {
        await window.electronAPI.plc.connect(config);
      }
      message.success('PLC 配置已保存');
    } catch {
      // validation error
    }
  };

  const handleSaveSysParams = async () => {
    try {
      const values = await sysForm.validateFields();
      if (window.electronAPI) {
        const settings = await window.electronAPI.settings.get();
        await window.electronAPI.settings.save({
          ...settings,
          pollInterval: values.pollInterval,
          historySaveInterval: values.historySaveInterval,
          alarmCheckEnabled: values.alarmCheckEnabled,
        });
      }
      message.success(t('common.success'));
    } catch {
      // validation error
    }
  };

  const handleSaveMappings = () => {
    modal.confirm({
      title: '确认修改点位映射',
      content: '修改点位映射将影响状态监视页面的数据显示，确认要保存吗？',
      okText: '确认保存',
      cancelText: '取消',
      onOk: async () => {
        try {
          const values = await mappingForm.validateFields();
          if (window.electronAPI) {
            const settings = await window.electronAPI.settings.get();
            await window.electronAPI.settings.save({
              ...settings,
              tagMappings: values as TagMapping,
            });
            setCurrentMappings(values as TagMapping);
          }
          message.success('点位映射已保存');
        } catch {
          // validation error
        }
      },
    });
  };

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    localStorage.setItem('i18nextLng', value);
  };

  const statusIndicator = (
    <Tag
      color={connectionStatus.connected ? 'green' : 'red'}
      icon={connectionStatus.connected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
    >
      {connectionStatus.connected
        ? `已连接${connectionStatus.simulation ? ' (模拟)' : ''}`
        : '未连接'}
    </Tag>
  );

  const tagOptions = availableTags.map((tag) => ({
    value: tag.name,
    label: `${tag.name} (${tag.address})`,
  }));

  return (
    <PageTransition direction="slide-right">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          {t('settings.title')}
        </Title>
      </div>

      <Tabs
        defaultActiveKey="plc"
        items={[
          {
            key: 'plc',
            label: (
              <span>
                <ApiOutlined /> {t('settings.plc')}
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <Card title="PLC 连接配置" size="small">
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Text strong>连接状态：</Text>
                        {statusIndicator}
                        {connectionStatus.connected && (
                          <Text type="secondary">
                            {' '}
                            延迟 {connectionStatus.latency}ms
                          </Text>
                        )}
                        {connectionStatus.lastError && (
                          <Text type="danger">错误: {connectionStatus.lastError}</Text>
                        )}
                      </Space>
                    </div>
                    <Form form={plcForm} layout="vertical">
                      <Form.Item
                        name="ip"
                        label={t('settings.ip')}
                        initialValue="192.168.1.100"
                        rules={[
                          { required: true, message: '请输入 IP 地址' },
                          {
                            pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                            message: 'IP 地址格式不正确',
                          },
                        ]}
                      >
                        <Input placeholder="192.168.1.100" />
                      </Form.Item>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="rack"
                            label={t('settings.rack')}
                            initialValue={0}
                          >
                            <InputNumber min={0} max={15} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="slot"
                            label={t('settings.slot')}
                            initialValue={1}
                          >
                            <InputNumber min={0} max={15} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Space>
                        {!connectionStatus.connected ? (
                          <Button type="primary" icon={<LinkOutlined />} onClick={handleConnect}>
                            {t('settings.connect')}
                          </Button>
                        ) : (
                          <Button
                            danger
                            icon={<CloseCircleOutlined />}
                            onClick={handleDisconnect}
                          >
                            {t('settings.disconnect')}
                          </Button>
                        )}
                        <Button icon={<ApiOutlined />} onClick={handleSavePlcConfig}>
                          保存配置
                        </Button>
                      </Space>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="连接统计" size="small">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="总请求次数">
                        {connectionStatus.reconnectAttempt || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="模拟模式">
                        {connectionStatus.simulation ? '是' : '否'}
                      </Descriptions.Item>
                      <Descriptions.Item label="延迟">
                        {connectionStatus.latency}ms
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'system',
            label: (
              <span>
                <SettingOutlined /> {t('settings.system')}
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <Card title="系统参数" size="small">
                    {sysParamsLoading ? (
                      <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin />
                      </div>
                    ) : (
                      <Form form={sysForm} layout="vertical">
                        <Form.Item
                          name="pollInterval"
                          label={t('settings.pollInterval')}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={100}
                            max={10000}
                            addonAfter="ms"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item
                          name="historySaveInterval"
                          label={t('settings.historySaveInterval')}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={1}
                            max={3600}
                            addonAfter={t('settings.seconds')}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item
                          name="alarmCheckEnabled"
                          label={t('settings.alarmCheck')}
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                        <Button type="primary" onClick={handleSaveSysParams}>
                          {t('common.save')}
                        </Button>
                      </Form>
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={t('settings.display')} size="small">
                    <Form layout="vertical">
                      <Form.Item label={t('settings.language')}>
                        <Select
                          value={i18n.language}
                          onChange={handleLanguageChange}
                          options={[
                            { value: 'zh-CN', label: '中文' },
                            { value: 'en-US', label: 'English' },
                          ]}
                          style={{ width: 200 }}
                        />
                      </Form.Item>
                      <Form.Item label={t('settings.theme')}>
                        <Space>
                          <Switch
                            checked={themeMode === 'dark'}
                            onChange={toggleTheme}
                            checkedChildren="暗色"
                            unCheckedChildren="亮色"
                          />
                          <Text type="secondary">
                            {themeMode === 'dark' ? t('settings.dark') : t('settings.light')}
                          </Text>
                        </Space>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'mapping',
            label: (
              <span>
                <NodeIndexOutlined /> 点位映射
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={16} lg={12}>
                  <Card
                    title={
                      <Space>
                        <NodeIndexOutlined />
                        <span>监控点位与 PLC 标签映射</span>
                        {!isAdmin && (
                          <Tag icon={<LockOutlined />} color="orange">
                            仅管理员可编辑
                          </Tag>
                        )}
                      </Space>
                    }
                    size="small"
                  >
                    {!isAdmin && currentMappings ? (
                      <Descriptions column={1} bordered size="small">
                        {MAPPING_FIELDS.map((field) => (
                          <Descriptions.Item key={field.key} label={t(field.labelKey)}>
                            {currentMappings[field.key]}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    ) : mappingLoading ? (
                      <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin />
                      </div>
                    ) : (
                      <Form form={mappingForm} layout="vertical">
                        {MAPPING_FIELDS.map((field) => (
                          <Form.Item
                            key={field.key}
                            name={field.key}
                            label={
                              <Space size={4}>
                                <span>{t(field.labelKey)}</span>
                                {field.unit && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    ({field.unit})
                                  </Text>
                                )}
                              </Space>
                            }
                            rules={[{ required: true, message: '请选择对应点位' }]}
                          >
                            <Select
                              showSearch
                              placeholder="搜索或选择 PLC 标签"
                              options={tagOptions}
                              allowClear
                              filterOption={(input, option) =>
                                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                              }
                            />
                          </Form.Item>
                        ))}
                        <Space>
                          <Button type="primary" onClick={handleSaveMappings}>
                            保存映射
                          </Button>
                          <Button onClick={() => mappingForm.resetFields()}>
                            重置
                          </Button>
                        </Space>
                      </Form>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'about',
            label: (
              <span>
                <InfoCircleOutlined /> {t('settings.about')}
              </span>
            ),
            children: (
              <Card title={t('settings.about')} size="small">
                {appInfoLoading ? (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <Spin />
                  </div>
                ) : (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label={t('settings.appName')}>
                      Industrial HMI
                    </Descriptions.Item>
                    <Descriptions.Item label={t('settings.version')}>
                      {appInfo?.version || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Electron">
                      {appInfo?.electronVersion || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Node.js">
                      {appInfo?.nodeVersion || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chrome">
                      {appInfo?.version || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('settings.platform')}>
                      {appInfo?.platform || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </Card>
            ),
          },
        ]}
      />
    </PageTransition>
  );
}

export default SettingsPage;