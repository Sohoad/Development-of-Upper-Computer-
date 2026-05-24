import { useMemo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../../stores/historyStore';
import type { HistoryRecord } from '@shared/types';

function HistoryTable() {
  const { t } = useTranslation();
  const queryResult = useHistoryStore((s) => s.queryResult);
  const isLoading = useHistoryStore((s) => s.isLoading);

  const columns: ColumnsType<HistoryRecord> = useMemo(
    () => [
      {
        title: t('history.time'),
        dataIndex: 'timestamp',
        key: 'timestamp',
        sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        defaultSortOrder: 'descend',
        render: (value: string) => new Date(value).toLocaleString(),
      },
      {
        title: t('history.tagName'),
        dataIndex: 'tagName',
        key: 'tagName',
        sorter: (a, b) => a.tagName.localeCompare(b.tagName),
        filters: [...new Set(queryResult.map((r) => r.tagName))].map((tag) => ({
          text: tag,
          value: tag,
        })),
        onFilter: (value, record) => record.tagName === value,
      },
      {
        title: t('history.value'),
        dataIndex: 'value',
        key: 'value',
        sorter: (a, b) => Number(a.value) - Number(b.value),
        render: (value: number | boolean) => {
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          return value.toFixed(2);
        },
      },
      {
        title: t('history.unit'),
        dataIndex: 'unit',
        key: 'unit',
        align: 'center',
      },
    ],
    [t, queryResult],
  );

  return (
    <Table<HistoryRecord>
      columns={columns}
      dataSource={queryResult}
      rowKey="id"
      loading={isLoading}
      size="small"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `${total}`,
        pageSizeOptions: ['10', '20', '50', '100'],
      }}
      scroll={{ y: 'calc(100% - 64px)' }}
      style={{ height: '100%' }}
      locale={{ emptyText: t('common.noData') }}
    />
  );
}

export default HistoryTable;