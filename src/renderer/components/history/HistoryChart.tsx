import { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../../stores/historyStore';
import { usePLCStore } from '../../stores/plcStore';
import type { HistoryRecord } from '@shared/types';

const CHART_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#ff4d4f',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
];

const DARK_THEME = {
  backgroundColor: 'transparent',
  textStyle: { color: 'rgba(255,255,255,0.85)' },
};

interface TagSeriesData {
  name: string;
  unit: string;
  data: [string, number][];
}

function HistoryChart() {
  const { t } = useTranslation();
  const queryResult = useHistoryStore((s) => s.queryResult);
  const selectedTags = useHistoryStore((s) => s.selectedTags);
  const isLoading = useHistoryStore((s) => s.isLoading);
  const tags = usePLCStore((s) => s.tags);
  const chartRef = useRef<ReactECharts>(null);

  const seriesData = useMemo<TagSeriesData[]>(() => {
    const tagUnitMap = new Map<string, string>();
    for (const tag of tags) {
      tagUnitMap.set(tag.name, tag.unit ?? '');
    }

    const grouped = new Map<string, HistoryRecord[]>();
    for (const r of queryResult) {
      if (selectedTags.includes(r.tagName)) {
        const arr = grouped.get(r.tagName) ?? [];
        arr.push(r);
        grouped.set(r.tagName, arr);
      }
    }

    return selectedTags.map((tagName) => {
      const records = grouped.get(tagName) ?? [];
      return {
        name: tagName,
        unit: tagUnitMap.get(tagName) ?? '',
        data: records
          .map((r) => [r.timestamp, Number(r.value)] as [string, number])
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()),
      };
    });
  }, [queryResult, selectedTags, tags]);

  const option = useMemo<EChartsOption>(() => {
    if (seriesData.length === 0) {
      return {};
    }

    return {
      ...DARK_THEME,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        valueFormatter: (value) => {
          if (value == null) return '-';
          if (typeof value === 'number') return value.toFixed(2);
          return String(value);
        },
      },
      legend: {
        data: seriesData.map((s) => s.name),
        textStyle: { color: 'rgba(255,255,255,0.65)' },
        top: 0,
      },
      grid: {
        left: 48,
        right: 48,
        top: 32,
        bottom: 48,
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: 'rgba(255,255,255,0.45)' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: t('history.value'),
        nameTextStyle: { color: 'rgba(255,255,255,0.45)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: 'rgba(255,255,255,0.45)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      series: seriesData.map((s, i) => ({
        name: s.name,
        type: 'line' as const,
        data: s.data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: CHART_COLORS[i % CHART_COLORS.length] },
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      })),
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          textStyle: { color: 'rgba(255,255,255,0.45)' },
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          dataBackground: {
            lineStyle: { color: 'rgba(255,255,255,0.15)' },
            areaStyle: { color: 'rgba(255,255,255,0.05)' },
          },
          selectedDataBackground: {
            lineStyle: { color: CHART_COLORS[0] },
            areaStyle: { color: 'rgba(24,144,255,0.1)' },
          },
        },
      ],
    };
  }, [seriesData, t]);

  if (queryResult.length === 0 && !isLoading) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.45)',
          border: '1px dashed rgba(255,255,255,0.12)',
          borderRadius: 8,
          margin: 8,
        }}
      >
        {t('common.noData')}
      </div>
    );
  }

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={{ width: '100%', height: '100%' }}
      showLoading={isLoading}
      theme="dark"
      notMerge
      lazyUpdate
    />
  );
}

export default HistoryChart;