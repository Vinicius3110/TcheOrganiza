import type { InstitutionAdapter, FetchResult } from './types';
import { normalizeTransaction, normalizeAccount } from '../normalizer/index';

const BRADESCO_ISPB = '60746948';

export function createBradescoAdapter(): InstitutionAdapter {
  return {
    ispb: BRADESCO_ISPB,
    name: 'Bradesco',

    async fetchData(consentToken: string): Promise<FetchResult> {
      console.log(`[Bradesco] Fetching data with consent token: ${consentToken.slice(0, 8)}...`);

      return {
        accounts: [
          normalizeAccount({
            id: 'bradesco-acc-1',
            name: 'Conta Corrente Bradesco',
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
 * Normalize raw Bradesco Open Finance response to our standard format.
 * Exported for testing.
 */
export function normalizeBradescoResponse(raw: any): FetchResult {
  const accounts = (raw.data?.accounts ?? raw.accounts ?? []).map((acc: any) =>
    normalizeAccount({
      id: acc.accountId ?? acc.brand?.accountId,
      name: acc.displayName ?? acc.nickname ?? acc.label ?? 'Conta Bradesco',
      type: acc.accountType ?? acc.type ?? 'corrente',
      currency: acc.currency ?? 'BRL',
      balance: Number(
        acc.balances?.[0]?.availableAmount?.amount ?? acc.balance?.amount ?? 0,
      ),
    }),
  );

  const transactions = (raw.data?.transactions ?? raw.transactions ?? []).map((tx: any) =>
    normalizeTransaction({
      id: tx.transactionId ?? tx.id,
      amount: Number(tx.amount ?? tx.transactionAmount),
      description: tx.transactionDescription ?? tx.description ?? tx.remittanceInformation ?? '',
      merchantName: tx.counterparty?.name ?? tx.merchant?.tradeName ?? tx.merchantName ?? undefined,
      merchantCnpj: tx.counterparty?.cnpjRootCnpj ?? tx.merchant?.cnpj ?? tx.merchantCnpj ?? undefined,
      date: tx.transactionDate ?? tx.bookingDate ?? tx.date,
      type: tx.type ?? tx.transactionType ?? tx.creditDebitType,
    }),
  );

  return { accounts, transactions };
}
