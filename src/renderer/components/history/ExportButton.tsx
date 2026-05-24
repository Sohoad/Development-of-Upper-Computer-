import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../../stores/historyStore';

function ExportButton() {
  const { t } = useTranslation();
  const queryResult = useHistoryStore((s) => s.queryResult);

  function generateCSV(): string {
    const BOM = '\uFEFF';
    const headers = [t('history.time'), t('history.tagName'), t('history.value'), t('history.unit')];
    const rows = queryResult.map((r) =>
      [r.timestamp, r.tagName, String(r.value), r.unit].map((v) => `"${v}"`).join(','),
    );
    return BOM + [headers.join(','), ...rows].join('\n');
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCSVExport() {
    const csvContent = generateCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(csvContent, `history_${timestamp}.csv`, 'text/csv');
  }

  function handleExcelExport() {
    const csvContent = generateCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(csvContent, `history_${timestamp}.xls`, 'application/vnd.ms-excel');
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: t('history.exportExcel'),
      onClick: handleExcelExport,
    },
    {
      key: 'csv',
      label: t('history.exportCsv'),
      onClick: handleCSVExport,
    },
  ];

  const disabled = queryResult.length === 0;

  return (
    <Dropdown menu={{ items: menuItems }} disabled={disabled} trigger={['click']}>
      <Button icon={<DownloadOutlined />} disabled={disabled}>
        {t('history.export')}
      </Button>
    </Dropdown>
  );
}

export default ExportButton;