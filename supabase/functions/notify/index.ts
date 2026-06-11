import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ExpoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*, categories(name), profiles!inner(push_token)')
      .eq('month', month);

    if (error) throw error;

    const messages: ExpoPushMessage[] = [];

    for (const budget of budgets ?? []) {
      const profile = (budget as any).profiles;
      if (!profile?.push_token) continue;

      const { data: txs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', budget.user_id)
        .eq('category_id', budget.category_id)
        .gte('date', month)
        .lt('amount', 0);

      const spent = (txs ?? []).reduce(
        (sum: number, tx: { amount: number }) => sum + Math.abs(Number(tx.amount)),
        0,
      );

      const budgetAmount = Number(budget.amount);
      const pct = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      if (pct >= 90) {
        const catName = ((budget as any).categories as any)?.name ?? 'Categoria';
        messages.push({
          to: profile.push_token,
          sound: 'default',
          title: 'Orçamento quase estourado!',
          body: `Você já gastou ${pct.toFixed(0)}% do orçamento de ${catName}.`,
          data: { screen: 'budgets' },
        });
      }
    }

    if (messages.length > 0) {
      const chunks = chunkArray(messages, 100);
      for (const chunk of chunks) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip, deflate' },
          body: JSON.stringify(chunk),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications: messages.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('Notify error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
