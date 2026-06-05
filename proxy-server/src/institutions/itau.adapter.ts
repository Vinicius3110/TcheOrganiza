import type { InstitutionAdapter, FetchResult } from './types';
import { normalizeTransaction, normalizeAccount } from '../normalizer/index';

const ITAU_ISPB = '60701190';

export function createItauAdapter(): InstitutionAdapter {
  return {
    ispb: ITAU_ISPB,
    name: 'Itaú',

    async fetchData(consentToken: string): Promise<FetchResult> {
      console.log(`[Itaú] Fetching data with consent token: ${consentToken.slice(0, 8)}...`);

      return {
        accounts: [
          normalizeAccount({
            id: 'itau-acc-1',
            name: 'Conta Corrente Itaú',
            type: 'corrente',
            balance: 0,
          }),
        ],
        transactions: [],
      };
    },
  };
}

/**
 * Normalize raw Itaú Open Finance response to our standard format.
 * Exported for testing.
 */
export function normalizeItauResponse(raw: any): FetchResult {
  const accounts = (raw.data?.accounts ?? []).map((acc: any) =>
    normalizeAccount({
      id: acc.accountId,
      name: acc.displayName ?? acc.nickname ?? 'Conta Itaú',
      type: acc.type ?? 'corrente',
      currency: acc.currency ?? 'BRL',
      balance: Number(acc.balances?.[0]?.amount ?? 0),
    }),
  );

  const transactions = (raw.data?.transactions ?? []).map((tx: any) =>
    normalizeTransaction({
      id: tx.transactionId,
      amount: Number(tx.amount),
      description: tx.transactionDescription ?? tx.remittanceInformation ?? '',
      merchantName: tx.counterparty?.name ?? tx.merchant?.name ?? undefined,
      merchantCnpj: tx.counterparty?.cnpj ?? tx.merchant?.cnpj ?? undefined,
      date: tx.transactionDate ?? tx.bookingDate ?? tx.valueDate,
      type: tx.type ?? tx.transactionType,
    }),
  );

  return { accounts, transactions };
}
