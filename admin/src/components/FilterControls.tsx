import { SearchOutlined } from '@ant-design/icons';
import { Button, DatePicker, Input, Select, Switch } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

/** Text search that waits for a pause in typing before it asks the server. */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return undefined;
    const timer = setTimeout(() => onChange(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);
  return (
    <Input
      allowClear
      aria-label={label}
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onPressEnter={() => onChange(text.trim())}
      style={{ width: 300, maxWidth: '100%' }}
    />
  );
}

export function SelectFilter({ value, onChange, options, placeholder, label, multiple, width = 190 }: {
  value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder: string; label: string; multiple?: boolean; width?: number;
}) {
  return multiple ? (
    <Select
      mode="multiple" allowClear showSearch={false} maxTagCount="responsive" aria-label={label} placeholder={placeholder} options={options} style={{ minWidth: width }}
      value={value ? value.split(',') : []} onChange={(next: string[]) => onChange(next.join(','))}
    />
  ) : (
    <Select allowClear aria-label={label} placeholder={placeholder} options={options} style={{ width }} value={value || undefined} onChange={(next) => onChange(next ?? '')} />
  );
}

export function DateRangeFilter({ from, to, onChange, label = 'Date range' }: { from: string; to: string; onChange: (from: string, to: string) => void; label?: string }) {
  return (
    <DatePicker.RangePicker
      aria-label={label}
      allowClear
      value={from && to ? [dayjs(from), dayjs(to)] : null}
      onChange={(values) => onChange(values?.[0]?.format('YYYY-MM-DD') ?? '', values?.[1]?.format('YYYY-MM-DD') ?? '')}
    />
  );
}

export function ToggleFilter({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Switch checked={checked} onChange={onChange} />{label}</label>;
}

export function ClearFilters({ show, onClear }: { show: boolean; onClear: () => void }) {
  return show ? <Button type="link" onClick={onClear}>Clear filters</Button> : null;
}
