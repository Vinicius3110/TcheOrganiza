import { normalizeBradescoResponse } from '../bradesco.adapter';

const mockBradescoResponse = {
  data: {
    accounts: [
      {
        accountId: 'bradesco-001',
        displayName: 'Conta Fácil',
        accountType: 'corrente',
        currency: 'BRL',
        balances: [{ availableAmount: { amount: 3200.50 } }],
      },
    ],
    transactions: [
      {
        transactionId: 'bradesco-tx-001',
        amount: -89.90,
        transactionDescription: 'PGTO RESTAURANTE',
        counterparty: { name: 'Restaurante Sabor', cnpjRootCnpj: '98765432000111' },
        transactionDate: '2026-06-02',
        creditDebitType: 'DEBIT',
      },
      {
        transactionId: 'bradesco-tx-002',
        amount: -250.00,
        description: 'SAQUE CAIXA ELETRONICO',
        transactionDate: '2026-06-01',
        creditDebitType: 'DEBIT',
      },
    ],
  },
};

describe('Bradesco Adapter — normalizeBradescoResponse', () => {
  it('normalizes accounts with correct balance path', () => {
    const result = normalizeBradescoResponse(mockBradescoResponse);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      externalId: 'bradesco-001',
      name: 'Conta Fácil',
      type: 'corrente',
      balance: 3200.50,
    });
  });

  it('normalizes transactions with counterparty CNPJ', () => {
    const result = normalizeBradescoResponse(mockBradescoResponse);
    const tx = result.transactions.find((t) => t.externalId === 'bradesco-tx-001')!;
    expect(tx).toMatchObject({
      amount: -89.90,
      merchantName: 'Restaurante Sabor',
      merchantCnpj: '98765432000111',
      type: 'DEBIT',
    });
  });

  it('handles transactions without counterparty', () => {
    const result = normalizeBradescoResponse(mockBradescoResponse);
    const tx = result.transactions.find((t) => t.externalId === 'bradesco-tx-002')!;
    expect(tx).toMatchObject({ amount: -250.00, type: 'DEBIT' });
    expect(tx.merchantName).toBeUndefined();
  });

  it('handles empty response', () => {
    const result = normalizeBradescoResponse({ data: {} });
    expect(result.accounts).toEqual([]);
    expect(result.transactions).toEqual([]);
  });
});
