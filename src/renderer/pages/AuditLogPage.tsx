import { useEffect } from 'react';
import { Typography, DatePicker, Select, Input, Button, Table, Tag, Space, Card } from 'antd';
import { SearchOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { PageTransition } from '../components/common';
import PermissionGuard from '../components/common/PermissionGuard';
import { useAuditStore } from '../stores/auditStore';
import type { AuditLog } from '@shared/types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const actionColorMap: Record<string, string> = {
  write: 'blue',
  recipe: 'green',
  system: 'orange',
  login: 'purple',
};

const actionLabelMap: Record<string, string> = {
  write: '写入',
  recipe: '配方',
  system: '系统',
  login: '登录',
};

function AuditLogPage() {
  const { t } = useTranslation();
  const { logs, isLoading, filters, queryLogs, setFilters, exportCSV } = useAuditStore();

  useEffect(() => {
    queryLogs();
  }, []);

  const handleQuery = () => {
    queryLogs();
  };

  const handleTimeRangeChange = (_: unknown, dateStrings: [string, string]) => {
    setFilters({
      startTime: dateStrings[0] ? new Date(dateStrings[0]).toISOString() : undefined,
      endTime: dateStrings[1] ? new Date(dateStrings[1]).toISOString() : undefined,
    });
  };

  const columns = [
    {
      title: t('audit.time'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
    {
      title: t('audit.user'),
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: t('audit.action'),
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color={actionColorMap[action] || 'default'}>
          {actionLabelMap[action] || action}
        </Tag>
      ),
    },
    {
      title: t('audit.target'),
      dataIndex: 'target',
      key: 'target',
      width: 160,
    },
    {
      title: t('audit.value'),
      dataIndex: 'value',
      key: 'value',
      width: 160,
    },
  ];

  return (
    <PermissionGuard requiredRole="admin">
      <PageTransition direction="slide-right">
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Title level={3} style={{ margin: 0 }}>
              {t('audit.title')}
            </Title>
            <Space>
              <Button
                icon={<ExportOutlined />}
                onClick={exportCSV}
              >
                {t('audit.export')}
              </Button>
            </Space>
          </div>

          <Card style={{ marginBottom: 16 }}>
            <Space wrap>
              <RangePicker
                showTime
                onChange={handleTimeRangeChange}
                placeholder={[t('history.timeRange'), t('history.timeRange')]}
              />
              <Select
                allowClear
                placeholder={t('audit.action')}
                style={{ width: 120 }}
                value={filters.action || undefined}
                onChange={(value) => setFilters({ action: value })}
                options={[
                  { label: actionLabelMap.write, value: 'write' },
                  { label: actionLabelMap.recipe, value: 'recipe' },
                  { label: actionLabelMap.system, value: 'system' },
                  { label: actionLabelMap.login, value: 'login' },
                ]}
              />
              <Input.Search
                placeholder={t('audit.user')}
                style={{ width: 200 }}
                value={filters.userId || ''}
                onChange={(e) => setFilters({ userId: e.target.value || undefined })}
                onSearch={handleQuery}
                enterButton={<SearchOutlined />}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleQuery}
              >
                {t('common.search')}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setFilters({ startTime: undefined, endTime: undefined, userId: undefined, action: undefined });
                  queryLogs({});
                }}
              >
                {t('common.reset')}
              </Button>
            </Space>
          </Card>

          <Table<AuditLog>
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={isLoading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            locale={{
              emptyText: t('common.noData'),
            }}
          />
        </div>
      </PageTransition>
    </PermissionGuard>
  );
}

export default AuditLogPage;