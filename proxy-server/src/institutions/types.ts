export interface NormalizedAccount {
  externalId: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento';
  currency: string;
  balance: number;
}

export interface NormalizedTransaction {
  externalId: string;
  amount: number;
  description: string;
  merchantName?: string;
  merchantCnpj?: string;
  date: string;
  type: 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
  status: 'pending' | 'posted';
  metadata: Record<string, unknown>;
}

export interface FetchResult {
  accounts: NormalizedAccount[];
  transactions: NormalizedTransaction[];
}

export interface InstitutionAdapter {
  ispb: string;
  name: string;
  fetchData(consentToken: string): Promise<FetchResult>;
}
