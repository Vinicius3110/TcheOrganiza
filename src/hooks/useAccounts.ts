import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { Account } from '../types/models';

async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('balance', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((a: any) => ({
    id: a.id,
    institutionId: a.institution_id,
    userId: a.user_id,
    externalId: a.external_id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: Number(a.balance),
    updatedAt: a.updated_at,
  }));
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });
}
