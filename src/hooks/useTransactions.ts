import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Transaction } from '../types/models';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseTransactionsOptions {
  categoryId?: string;
  accountId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

function mapTransaction(raw: any): Transaction {
  return {
    id: raw.id,
    accountId: raw.account_id,
    userId: raw.user_id,
    externalId: raw.external_id,
    amount: Number(raw.amount),
    description: raw.description,
    merchantName: raw.merchant_name ?? null,
    merchantCnpj: raw.merchant_cnpj ?? null,
    categoryId: raw.category_id ?? null,
    userCategoryId: raw.user_category_id ?? null,
    date: raw.date,
    type: raw.type,
    status: raw.status,
    metadata: raw.metadata ?? {},
    createdAt: raw.created_at,
  };
}

async function fetchTransactions(opts: UseTransactionsOptions = {}): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (opts.categoryId) query = query.eq('category_id', opts.categoryId);
  if (opts.accountId) query = query.eq('account_id', opts.accountId);
  if (opts.type) query = query.eq('type', opts.type);
  if (opts.startDate) query = query.gte('date', opts.startDate);
  if (opts.endDate) query = query.lte('date', opts.endDate);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapTransaction);
}

export function useTransactions(opts: UseTransactionsOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['transactions', opts],
    queryFn: () => fetchTransactions(opts),
  });

  // Real-time subscription: new transactions arrive while app is open
  useEffect(() => {
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
