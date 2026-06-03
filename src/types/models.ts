// ============================================
// Domain models — matches PostgreSQL schema
// ============================================

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  userId: string;
  name: string;
  ispb: string;
  consentId: string;
  status: 'active' | 'expired' | 'revoked';
  lastSyncAt: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  institutionId: string;
  userId: string;
  externalId: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento';
  currency: string;
  balance: number;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  isSystem: boolean;
  createdAt: string;
}

export type TransactionType = 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
export type TransactionStatus = 'pending' | 'posted' | 'categorized';

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  externalId: string;
  amount: number; // positive = entrada, negative = saida
  description: string;
  merchantName: string | null;
  merchantCnpj: string | null;
  categoryId: string | null;
  userCategoryId: string | null;
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CategorizationRule {
  id: string;
  userId: string;
  pattern: string;
  field: 'description' | 'merchant_name' | 'merchant_cnpj';
  categoryId: string;
  confidence: number;
  hitCount: number;
  createdAt: string;
}
