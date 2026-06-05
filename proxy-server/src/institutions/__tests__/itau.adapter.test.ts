import { normalizeItauResponse } from '../itau.adapter';

const mockItauResponse = {
  data: {
    accounts: [
      {
        accountId: 'itaú-acc-001',
        displayName: 'Conta Corrente',
        type: 'corrente',
        currency: 'BRL',
        balances: [{ amount: 5432.10 }],
      },
    ],
    transactions: [
      {
        transactionId: 'itau-tx-001',
        amount: -150.00,
        transactionDescription: 'PAGAMENTO BOLETO',
        counterparty: { name: 'Concessionária XPTO', cnpj: '12345678000199' },
        transactionDate: '2026-06-01',
        type: 'BOLETO',
      },
      {
        transactionId: 'itau-tx-002',
        amount: 5000.00,
        transactionDescription: 'TRANSFERÊNCIA RECEBIDA',
        counterparty: { name: 'Empresa ABC' },
        transactionDate: '2026-05-30',
        type: 'TED',
      },
    ],
  },
};

describe('Itaú Adapter — normalizeItauResponse', () => {
  it('normalizes accounts correctly', () => {
    const result = normalizeItauResponse(mockItauResponse);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      externalId: 'itaú-acc-001',
      name: 'Conta Corrente',
      type: 'corrente',
      currency: 'BRL',
      balance: 5432.10,
    });
  });

  it('normalizes transactions correctly', () => {
    const result = normalizeItauResponse(mockItauResponse);
    expect(result.transactions).toHaveLength(2);

    const boleto = result.transactions.find((t) => t.externalId === 'itau-tx-001')!;
    expect(boleto).toMatchObject({
      amount: -150.00,
      description: 'PAGAMENTO BOLETO',
      merchantName: 'Concessionária XPTO',
      merchantCnpj: '12345678000199',
      type: 'BOLETO',
    });

    const ted = result.transactions.find((t) => t.externalId === 'itau-tx-002')!;
    expect(ted).toMatchObject({
      amount: 5000.00,
      type: 'TED',
    });
  });

  it('handles empty response gracefully', () => {
    const result = normalizeItauResponse({ data: {} });
    expect(result.accounts).toEqual([]);
    expect(result.transactions).toEqual([]);
  });
});
