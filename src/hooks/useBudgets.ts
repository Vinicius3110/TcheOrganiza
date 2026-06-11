import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { Budget } from '../types/budget';

function mapBudget(raw: any): Budget {
  return {
    id: raw.id,
    userId: raw.user_id,
    categoryId: raw.category_id,
    amount: Number(raw.amount),
    month: raw.month,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

async function fetchBudgets(month: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('month', month)
    .order('created_at');

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBudget);
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: () => fetchBudgets(month),
  });
}

export function useUpsertBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { categoryId: string; amount: number; month: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          { user_id: userId, category_id: input.categoryId, amount: input.amount, month: input.month },
          { onConflict: 'user_id, category_id, month' },
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapBudget(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', variables.month] });
    },
  });
}
