import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PROXY_URL: z.string().url().default('http://localhost:3001'),
});

const env = EnvSchema.parse({
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  PROXY_URL: Deno.env.get('PROXY_URL') || 'http://localhost:3001',
});

const ProxyAccountSchema = z.object({
  externalId: z.string(),
  name: z.string(),
  type: z.enum(['corrente', 'poupanca', 'investimento']),
  currency: z.string(),
  balance: z.number(),
});

const ProxyTransactionSchema = z.object({
  externalId: z.string(),
  amount: z.number(),
  description: z.string(),
  merchantName: z.string().optional(),
  merchantCnpj: z.string().optional(),
  date: z.string(),
  type: z.enum(['DEBIT', 'CREDIT', 'PIX', 'TED', 'BOLETO']),
  status: z.enum(['pending', 'posted']),
  metadata: z.record(z.unknown()).default({}),
});

const ProxyResponseSchema = z.object({
  accounts: z.array(ProxyAccountSchema),
  transactions: z.array(ProxyTransactionSchema),
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { data: institutions, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('status', 'active')
      .gt('token_expires', new Date().toISOString());

    if (error) throw error;

    let processed = 0;
    let failed = 0;

    for (const inst of institutions ?? []) {
      try {
        const proxyRes = await fetch(`${env.PROXY_URL}/api/fetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consentToken: inst.vault_key_id,
            ispb: inst.ispb,
          }),
        });

        if (!proxyRes.ok) {
          console.error(`Proxy fetch failed for ${inst.name}: ${proxyRes.status}`);
          failed++;
          continue;
        }

        const rawJson = await proxyRes.json();
        const { accounts, transactions } = ProxyResponseSchema.parse(rawJson);

        for (const acc of accounts) {
          await supabase.from('accounts').upsert(
            {
              institution_id: inst.id,
              user_id: inst.user_id,
              external_id: acc.externalId,
              name: acc.name,
              type: acc.type,
              currency: acc.currency,
              balance: acc.balance,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'external_id, institution_id' }
          );
        }

        for (const tx of transactions) {
          await supabase.from('transactions').upsert(
            {
              account_id: inst.id,
              user_id: inst.user_id,
              external_id: tx.externalId,
              amount: tx.amount,
              description: tx.description,
              merchant_name: tx.merchantName,
              merchant_cnpj: tx.merchantCnpj,
              date: tx.date,
              type: tx.type,
              status: tx.status,
              metadata: tx.metadata ?? {},
            },
            { onConflict: 'external_id, account_id' }
          );
        }

        await supabase
          .from('institutions')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', inst.id);

        processed++;
      } catch (err) {
        console.error(`Error processing ${inst.name}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, failed }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Polling error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
