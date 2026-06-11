import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const env = EnvSchema.parse({
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
});

const AccountRowSchema = z.object({
  id: z.string().uuid(),
});

const TransactionAmountSchema = z.object({
  amount: z.number(),
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
      const validAccount = AccountRowSchema.parse(account);

      const { data: result } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', validAccount.id);

      const validResults = z.array(TransactionAmountSchema).parse(result ?? []);

      const balance = validResults.reduce(
        (sum: number, tx: { amount: number }) => sum + tx.amount,
        0
      );

      await supabase
        .from('accounts')
        .update({ balance, updated_at: new Date().toISOString() })
        .eq('id', validAccount.id);

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
