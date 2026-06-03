import { formatCurrency, getEffectiveCategory, isIncome, isExpense } from '../format';

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
