import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*, categories(name)')
      .eq('month', month);

    if (error) throw error;

    let alerts = 0;

    for (const budget of budgets ?? []) {
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

      if (pct >= 80) {
        console.log(`[Budget Alert] User ${budget.user_id}: ${(budget.categories as any)?.name} at ${pct.toFixed(0)}%`);
        alerts++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts, month }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('Budget checker error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
