import { DatePicker, Segmented, Space } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { describeRange, presetRange, startOfDayIst, type DateRange, type RangePreset } from '@/lib/dates';

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '6m', label: '6 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
];

/** Period state lives in the URL (?range=6m or ?range=custom&from=…&to=…), so any view is shareable. */
export function useDateRange(): { range: DateRange; preset: RangePreset; setPreset: (preset: RangePreset) => void; setCustom: (range: DateRange) => void } {
  const [params, setParams] = useSearchParams();
  const rawPreset = params.get('range') as RangePreset | null;
  const preset: RangePreset = PRESETS.some((item) => item.value === rawPreset) ? (rawPreset as RangePreset) : '6m';
  const from = params.get('from');
  const to = params.get('to');

  const range = useMemo<DateRange>(() => {
    if (preset === 'custom' && from && to && startOfDayIst(from) !== null && startOfDayIst(to) !== null && from <= to) return { from, to };
    return presetRange(preset === 'custom' ? '6m' : preset);
  }, [preset, from, to]);

  const setPreset = useCallback((next: RangePreset) => {
    setParams((current) => {
      const copy = new URLSearchParams(current);
      copy.set('range', next);
      if (next !== 'custom') { copy.delete('from'); copy.delete('to'); }
      return copy;
    }, { replace: true });
  }, [setParams]);

  const setCustom = useCallback((next: DateRange) => {
    setParams((current) => {
      const copy = new URLSearchParams(current);
      copy.set('range', 'custom');
      copy.set('from', next.from);
      copy.set('to', next.to);
      return copy;
    }, { replace: true });
  }, [setParams]);

  return { range, preset, setPreset, setCustom };
}

export function DateRangeControl({ range, preset, setPreset, setCustom }: ReturnType<typeof useDateRange>) {
  return (
    <Space wrap size={12} align="center">
      <Segmented<RangePreset> options={PRESETS} value={preset} onChange={setPreset} aria-label="Reporting period" />
      {preset === 'custom' ? (
        <DatePicker.RangePicker
          allowClear={false}
          value={[dayjs(range.from), dayjs(range.to)]}
          disabledDate={(day) => day.isAfter(dayjs(), 'day')}
          onChange={(values) => values?.[0] && values[1] && setCustom({ from: values[0].format('YYYY-MM-DD'), to: values[1].format('YYYY-MM-DD') })}
          aria-label="Custom date range"
        />
      ) : null}
      <span className="muted num" aria-live="polite">{describeRange(range)} · India time</span>
    </Space>
  );
}
