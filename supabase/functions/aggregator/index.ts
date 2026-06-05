import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*');

    if (error) throw error;

    let updated = 0;

    for (const account of accounts ?? []) {
      const { data: result } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', account.id);

      const balance = (result ?? []).reduce(
        (sum: number, tx: { amount: number }) => sum + Number(tx.amount),
        0
      );

      await supabase
        .from('accounts')
        .update({ balance, updated_at: new Date().toISOString() })
        .eq('id', account.id);

      updated++;
    }

    return new Response(
      JSON.stringify({ success: true, updated }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Aggregator error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
