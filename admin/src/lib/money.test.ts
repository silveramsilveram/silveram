import { describe, expect, it } from 'vitest';
import { formatPaise, formatPaiseCompact, paiseToRupeesInput, rupeesToPaise } from './money';

describe('rupees <-> paise', () => {
  it('converts exactly, with no floating point drift', () => {
    expect(rupeesToPaise('19.99')).toBe(1999); // 19.99 * 100 === 1998.9999999999998 in floating point
    expect(rupeesToPaise('1.1')).toBe(110);
    expect(rupeesToPaise('0.07')).toBe(7);
    expect(rupeesToPaise('1,299.50')).toBe(129950);
    expect(rupeesToPaise('₹ 2,000')).toBe(200000);
    expect(rupeesToPaise(250)).toBe(25000);
    expect(rupeesToPaise('21474836.47')).toBe(2147483647);
  });

  it('rejects anything that is not a valid amount', () => {
    for (const bad of ['', ' ', 'abc', '1.234', '-5', '1e3', '12.', '.5', '1,2,3x', '999999999', null, undefined]) {
      expect(rupeesToPaise(bad as string)).toBeNull();
    }
  });

  it('round-trips every whole-paise value in a sample range', () => {
    for (let paise = 0; paise < 20000; paise += 7) expect(rupeesToPaise(paiseToRupeesInput(paise))).toBe(paise);
    expect(paiseToRupeesInput(129950)).toBe('1299.50');
    expect(paiseToRupeesInput(5)).toBe('0.05');
  });

  it('formats rupees with Indian digit grouping', () => {
    expect(formatPaise(129950)).toBe('₹1,299.50');
    expect(formatPaise(12345678900)).toBe('₹12,34,56,789.00');
    expect(formatPaise(-500)).toBe('-₹5.00');
    expect(formatPaise(null)).toBe('—');
    expect(formatPaiseCompact(125_000_00)).toBe('₹1.25L');
    expect(formatPaiseCompact(1_500_00)).toBe('₹1.5K');
  });
});
