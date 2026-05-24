import { useCallback } from 'react';
import { Space, Button, Card, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { PageTransition } from '../components/common';
import { TimeRangePicker, TagSelector, HistoryChart, HistoryTable, ExportButton } from '../components/history';
import { useHistoryStore } from '../stores/historyStore';
import { useResponsive } from '../hooks/useResponsive';

function HistoryPage() {
  const { t } = useTranslation();
  const queryHistory = useHistoryStore((s) => s.queryHistory);
  const isLoading = useHistoryStore((s) => s.isLoading);
  const timeRange = useHistoryStore((s) => s.timeRange);
  const selectedTags = useHistoryStore((s) => s.selectedTags);
  const queryResult = useHistoryStore((s) => s.queryResult);
  const { breakpoint, isMobile } = useResponsive();

  const handleQuery = useCallback(() => {
    if (selectedTags.length > 0 && timeRange.startTime && timeRange.endTime) {
      queryHistory(selectedTags, timeRange.startTime, timeRange.endTime);
    }
  }, [selectedTags, timeRange, queryHistory]);

  const hasData = queryResult.length > 0;

  const isStacked = breakpoint !== 'lg';

  return (
    <PageTransition direction="slide-right">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', gap: 12 }}>
        <Card size="small" bodyStyle={{ padding: isMobile ? '8px 12px' : '12px 16px' }}>
          <Space wrap size={isMobile ? 4 : 8}>
            <TimeRangePicker />
            <TagSelector />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleQuery}
              loading={isLoading}
              size={isMobile ? 'small' : 'middle'}
            >
              {t('history.query')}
            </Button>
            <ExportButton />
          </Space>
        </Card>

        {!hasData && (
          <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description={t('common.noData')} />
          </Card>
        )}

        {hasData && isStacked && (
          <>
            <Card size="small" bodyStyle={{ height: 280, padding: 0 }}>
              <HistoryChart />
            </Card>
            <Card size="small" bodyStyle={{ height: 280, padding: 0 }}>
              <HistoryTable />
            </Card>
          </>
        )}

        {hasData && !isStacked && (
          <>
            <Card size="small" bodyStyle={{ height: 'calc((100vh - 224px) * 0.6)', padding: 0 }}>
              <HistoryChart />
            </Card>
            <Card size="small" bodyStyle={{ height: 'calc((100vh - 224px) * 0.4)', padding: 0 }}>
              <HistoryTable />
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}

export default HistoryPage;