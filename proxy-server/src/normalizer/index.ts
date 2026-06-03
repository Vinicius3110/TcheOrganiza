import type { NormalizedTransaction, NormalizedAccount } from '../institutions/types';

export function normalizeTransaction(
  raw: Record<string, any>,
  overrides: Partial<NormalizedTransaction> = {}
): NormalizedTransaction {
  return {
    externalId: String(raw.id ?? raw.transactionId ?? ''),
    amount: Number(raw.amount ?? raw.value ?? 0),
    description: String(raw.description ?? raw.memo ?? ''),
    merchantName: raw.merchant?.name ?? raw.merchantName ?? undefined,
    merchantCnpj: raw.merchant?.cnpj ?? raw.merchantCnpj ?? undefined,
    date: String(raw.date ?? raw.createdAt ?? new Date().toISOString()),
    type: mapTransactionType(raw),
    status: 'posted',
    metadata: raw.metadata ?? {},
    ...overrides,
  };
}

function mapTransactionType(raw: Record<string, any>): NormalizedTransaction['type'] {
  const type = String(raw.type ?? raw.transactionType ?? '').toUpperCase();
  if (type.includes('PIX')) return 'PIX';
  if (type.includes('CREDIT') || type.includes('CRÉDITO')) return 'CREDIT';
  if (type.includes('TED') || type.includes('DOC')) return 'TED';
  if (type.includes('BOLETO') || type.includes('SLIP')) return 'BOLETO';
  return 'DEBIT';
}

export function normalizeAccount(raw: Record<string, any>): NormalizedAccount {
  return {
    externalId: String(raw.id ?? raw.accountId ?? ''),
    name: String(raw.name ?? raw.label ?? 'Conta'),
    type: mapAccountType(raw),
    currency: String(raw.currency ?? 'BRL'),
    balance: Number(raw.balance ?? 0),
  };
}

function mapAccountType(raw: Record<string, any>): NormalizedAccount['type'] {
  const type = String(raw.type ?? raw.accountType ?? '').toLowerCase();
  if (type.includes('poupanca') || type.includes('savings')) return 'poupanca';
  if (type.includes('invest')) return 'investimento';
  return 'corrente';
}
