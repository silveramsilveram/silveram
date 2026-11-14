import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, istInputToMs, msToIstInput, presetRange, startOfDayIst, ymdIst } from './dates';

describe('India time handling', () => {
  it('puts the day boundary at 18:30 UTC', () => {
    expect(startOfDayIst('2026-06-10')).toBe(Date.UTC(2026, 5, 9, 18, 30));
    expect(ymdIst(Date.UTC(2026, 5, 9, 18, 29, 59))).toBe('2026-06-09');
    expect(ymdIst(Date.UTC(2026, 5, 9, 18, 30, 0))).toBe('2026-06-10');
    expect(ymdIst(Date.UTC(2026, 11, 31, 18, 30))).toBe('2027-01-01'); // year boundary
  });

  it('displays in IST whatever the machine time zone is', () => {
    const ms = Date.UTC(2026, 5, 9, 18, 45); // 00:15 on the 10th in India
    expect(formatDate(ms)).toMatch(/10 Jun 2026/);
    expect(formatDateTime(ms)).toMatch(/12:15\s?am/i);
    expect(formatDate(null)).toBe('—');
  });

  it('reads and writes datetime-local values as India time', () => {
    const ms = istInputToMs('2026-06-10T00:15');
    expect(ms).toBe(Date.UTC(2026, 5, 9, 18, 45));
    expect(msToIstInput(ms as number)).toBe('2026-06-10T00:15');
    expect(istInputToMs('nonsense')).toBeNull();
    expect(startOfDayIst('2026-02-30')).toBeNull();
  });

  it('resolves presets against the current India date', () => {
    const now = Date.UTC(2026, 10, 14, 10); // 14 Nov 2026
    expect(presetRange('6m', now)).toEqual({ from: '2026-06-01', to: '2026-11-14' });
    expect(presetRange('7d', now)).toEqual({ from: '2026-11-08', to: '2026-11-14' });
    expect(presetRange('30d', now)).toEqual({ from: '2026-10-16', to: '2026-11-14' });
    expect(presetRange('ytd', now)).toEqual({ from: '2026-01-01', to: '2026-11-14' });
    // Just after midnight India time it is already tomorrow's date.
    expect(presetRange('7d', Date.UTC(2026, 10, 13, 18, 45)).to).toBe('2026-11-14');
  });

  it('wraps the six-month window across a year boundary', () => {
    expect(presetRange('6m', Date.UTC(2026, 1, 3, 10))).toEqual({ from: '2025-09-01', to: '2026-02-03' });
  });
});
