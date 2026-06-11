import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getEffectiveCategory,
  isIncome,
  isExpense,
} from '../format';

describe('formatCurrency', () => {
  it('formats positive amounts with BRL symbol', () => {
    expect(formatCurrency(1234.56)).toBe('R$\xA01.234,56');
  });

  it('formats negative amounts with minus prefix', () => {
    expect(formatCurrency(-500)).toBe('-R$\xA0500,00');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('R$\xA00,00');
  });

  it('handles large amounts', () => {
    expect(formatCurrency(1000000)).toBe('R$\xA01.000.000,00');
  });
});

describe('formatDate', () => {
  it('formats a date string to Brazilian format dd/mm/yyyy', () => {
    // Use a full ISO datetime to avoid timezone skew
    const result = formatDate('2026-06-03T12:00:00');
    expect(result).toBe('03/06/2026');
  });

  it('formats first day of year correctly', () => {
    const result = formatDate('2026-01-01T12:00:00');
    expect(result).toBe('01/01/2026');
  });

  it('formats last day of year correctly', () => {
    const result = formatDate('2026-12-31T12:00:00');
    expect(result).toBe('31/12/2026');
  });

  it('handles date-only string by treating as local time', () => {
    const result = formatDate('2026-06-01');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('formatRelativeDate', () => {
  it('returns "Hoje" for today', () => {
    const today = new Date();
    const dateStr = today.toISOString();
    expect(formatRelativeDate(dateStr)).toBe('Hoje');
  });

  it('returns "Ontem" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString();
    expect(formatRelativeDate(dateStr)).toBe('Ontem');
  });

  it('returns "N dias atrás" for dates 2-6 days ago', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = threeDaysAgo.toISOString();
    expect(formatRelativeDate(dateStr)).toBe('3 dias atrás');
  });

  it('returns formatted date for dates older than 6 days', () => {
    const result = formatRelativeDate('2020-01-15T12:00:00');
    expect(result).toBe('15/01/2020');
  });
});

describe('getEffectiveCategory', () => {
  it('returns user category override when set', () => {
    expect(getEffectiveCategory({ categoryId: 'auto-1', userCategoryId: 'user-2' }))
      .toBe('user-2');
  });

  it('returns automatic category when no user override', () => {
    expect(getEffectiveCategory({ categoryId: 'auto-1', userCategoryId: null }))
      .toBe('auto-1');
  });

  it('returns null when neither category is set', () => {
    expect(getEffectiveCategory({ categoryId: null, userCategoryId: null }))
      .toBeNull();
  });
});

describe('isIncome / isExpense', () => {
  it('identifies income as positive amount', () => {
    expect(isIncome(100)).toBe(true);
    expect(isIncome(0)).toBe(false);
    expect(isIncome(-100)).toBe(false);
  });

  it('identifies expense as negative amount', () => {
    expect(isExpense(-50)).toBe(true);
    expect(isExpense(0)).toBe(false);
    expect(isExpense(50)).toBe(false);
  });
});
