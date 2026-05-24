import { useMemo } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../../stores/historyStore';

type RangeValue = [Dayjs | null, Dayjs | null] | null;

function TimeRangePicker() {
  const { t } = useTranslation();
  const timeRange = useHistoryStore((s) => s.timeRange);

  const now = useMemo(() => dayjs(), []);
  const rangePresets = useMemo<NonNullable<Parameters<typeof DatePicker.RangePicker>[0]>['presets']>(
    () => [
      {
        label: t('history.last1Hour'),
        value: [now.subtract(1, 'hour'), now],
      },
      {
        label: t('history.last24Hours'),
        value: [now.subtract(24, 'hour'), now],
      },
      {
        label: t('history.last7Days'),
        value: [now.subtract(7, 'day'), now],
      },
      {
        label: t('history.last30Days'),
        value: [now.subtract(30, 'day'), now],
      },
    ],
    [t, now],
  );

  const handleChange = (_: unknown, dateStrings: [string, string]) => {
    useHistoryStore.setState({
      timeRange: { startTime: dateStrings[0], endTime: dateStrings[1] },
    });
  };

  const value: RangeValue =
    timeRange.startTime && timeRange.endTime
      ? [dayjs(timeRange.startTime), dayjs(timeRange.endTime)]
      : null;

  return (
    <DatePicker.RangePicker
      showTime
      presets={rangePresets}
      placeholder={[t('history.timeRange'), t('history.timeRange')]}
      onChange={handleChange}
      value={value}
      style={{ minWidth: 360 }}
    />
  );
}

export default TimeRangePicker;