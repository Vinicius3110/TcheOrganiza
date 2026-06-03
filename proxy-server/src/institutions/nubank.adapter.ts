import type { InstitutionAdapter, FetchResult } from './types';
import { normalizeTransaction, normalizeAccount } from '../normalizer/index';

export function createNubankAdapter(): InstitutionAdapter {
  return {
    ispb: '26041819',
    name: 'Nubank',

    async fetchData(consentToken: string): Promise<FetchResult> {
      console.log(`[Nubank] Fetching data with consent token: ${consentToken.slice(0, 8)}...`);
      return {
        accounts: [normalizeAccount({ id: 'nubank-acc-1', name: 'Conta Nubank', type: 'corrente', balance: 0 })],
        transactions: [],
      };
    },
  };
}
