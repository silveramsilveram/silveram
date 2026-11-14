import { Table } from 'antd';
import { useId, useState } from 'react';

export interface BarDatum {
  key: string;
  label: string;
  /** null = no data exists for this period (drawn as a marker, never as a zero). */
  values: (number | null)[];
}
export interface BarSeriesSpec { name: string; color: string }

interface Props {
  data: BarDatum[];
  series: BarSeriesSpec[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
  ariaLabel: string;
  height?: number;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * pow >= max) ?? 10;
  return step * pow;
}

/**
 * Grouped bar chart in plain SVG: restrained palette, labelled axes, a tooltip on hover/focus, and
 * a "View as table" fallback so the same numbers are available to screen readers and keyboards.
 * Periods with no stored data show a hollow "n/a" marker instead of an invented zero.
 */
export function BarChart({ data, series, format, formatAxis = format, ariaLabel, height = 280 }: Props) {
  const [active, setActive] = useState<{ index: number; x: number } | null>(null);
  const titleId = useId();
  const width = 760;
  const margin = { top: 12, right: 8, bottom: 34, left: 58 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const max = niceMax(Math.max(0, ...data.flatMap((row) => row.values.filter((v): v is number => v !== null))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => max * fraction);
  const band = innerW / Math.max(data.length, 1);
  const groupW = Math.min(band * 0.76, 64 * series.length);
  const barW = groupW / series.length;
  const labelEvery = Math.ceil(data.length / 12);
  const y = (value: number) => margin.top + innerH - (value / max) * innerH;
  const hasAnyData = data.some((row) => row.values.some((value) => value !== null));

  return (
    <div className="sv-chart" style={{ position: 'relative' }}>
      <div className="sv-legend" aria-hidden="true">
        {series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId} onMouseLeave={() => setActive(null)}>
        <title id={titleId}>{ariaLabel}</title>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} stroke="#e7e5e0" strokeWidth={1} />
            <text x={margin.left - 8} y={y(tick) + 4} textAnchor="end">{formatAxis(tick)}</text>
          </g>
        ))}
        {data.map((row, index) => {
          const left = margin.left + index * band + (band - groupW) / 2;
          const unavailable = row.values.every((value) => value === null);
          return (
            <g key={row.key}>
              {unavailable ? (
                <g>
                  <rect x={left} y={y(0) - 22} width={groupW} height={22} rx={4} fill="none" stroke="#a7adb5" strokeDasharray="3 3">
                    <title>{`${row.label}: no data stored for this period`}</title>
                  </rect>
                  <text x={left + groupW / 2} y={y(0) - 7} textAnchor="middle" style={{ fontSize: 11 }}>n/a</text>
                </g>
              ) : series.map((item, seriesIndex) => {
                const value = row.values[seriesIndex];
                if (value === null || value === undefined) return null;
                const barY = y(value);
                return (
                  <rect
                    key={item.name}
                    className="bar"
                    x={left + seriesIndex * barW + 1}
                    y={barY}
                    width={Math.max(barW - 2, 2)}
                    height={Math.max(y(0) - barY, value > 0 ? 1 : 0)}
                    rx={2}
                    fill={item.color}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${row.label}, ${item.name}: ${format(value)}`}
                    onMouseEnter={() => setActive({ index, x: ((left + groupW / 2) / width) * 100 })}
                    onFocus={() => setActive({ index, x: ((left + groupW / 2) / width) * 100 })}
                    onBlur={() => setActive(null)}
                  />
                );
              })}
              {index % labelEvery === 0 ? (
                <text x={left + groupW / 2} y={height - 12} textAnchor="middle">{row.label}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {!hasAnyData ? <div className="muted" style={{ textAlign: 'center', marginTop: -8 }}>No stored data for this period yet.</div> : null}
      {active ? (
        <div className="sv-chart-tip" style={{ left: `clamp(8px, calc(${active.x}% - 80px), calc(100% - 170px))`, top: 40 }} role="status">
          <strong>{data[active.index].label}</strong>
          {series.map((item, i) => {
            const value = data[active.index].values[i];
            return <div key={item.name}>{item.name}: {value === null ? 'no data' : format(value)}</div>;
          })}
        </div>
      ) : null}
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>View as table</summary>
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={data}
          columns={[
            { title: 'Period', dataIndex: 'label' },
            ...series.map((item, i) => ({
              title: item.name,
              align: 'right' as const,
              render: (_: unknown, row: BarDatum) => (row.values[i] === null ? 'No data' : format(row.values[i] as number)),
            })),
          ]}
        />
      </details>
    </div>
  );
}
