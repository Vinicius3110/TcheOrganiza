import { normalizeTransaction, normalizeAccount } from '../index';

describe('normalizeTransaction', () => {
  it('converts standard bank transaction to our format', () => {
    const raw = { id: 'tx-001', amount: -150.75, description: 'UBER *TRIP', merchant: { name: 'Uber', cnpj: '12345678000199' }, date: '2026-06-01', type: 'DEBIT' };
    const result = normalizeTransaction(raw);
    expect(result.externalId).toBe('tx-001');
    expect(result.amount).toBe(-150.75);
    expect(result.merchantName).toBe('Uber');
    expect(result.merchantCnpj).toBe('12345678000199');
    expect(result.type).toBe('DEBIT');
  });

  it('detects PIX transactions', () => {
    expect(normalizeTransaction({ id: '1', amount: 100, type: 'PIX' }).type).toBe('PIX');
  });

  it('detects CREDIT transactions from CRÉDITO', () => {
    expect(normalizeTransaction({ id: '1', amount: 500, type: 'CREDITO' }).type).toBe('CREDIT');
  });

  it('handles missing fields gracefully', () => {
    const result = normalizeTransaction({ id: '1' });
    expect(result.externalId).toBe('1');
    expect(result.amount).toBe(0);
    expect(result.description).toBe('');
    expect(result.type).toBe('DEBIT');
    expect(result.status).toBe('posted');
  });
});

describe('normalizeAccount', () => {
  it('converts a bank account to our format', () => {
    const result = normalizeAccount({ id: 'acc-1', name: 'Conta Corrente', type: 'corrente', balance: 5000 });
    expect(result.externalId).toBe('acc-1');
    expect(result.name).toBe('Conta Corrente');
    expect(result.type).toBe('corrente');
    expect(result.balance).toBe(5000);
    expect(result.currency).toBe('BRL');
  });
});
