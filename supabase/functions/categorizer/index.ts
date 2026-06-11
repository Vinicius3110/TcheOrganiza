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

const CategoryRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

const TransactionRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  description: z.string(),
  merchant_name: z.string().nullable(),
  merchant_cnpj: z.string().nullable(),
  category_id: z.string().uuid().nullable(),
  user_category_id: z.string().uuid().nullable(),
});

const CategorizationRuleRowSchema = z.object({
  user_id: z.string().uuid(),
  pattern: z.string(),
  field: z.enum(['description', 'merchant_name', 'merchant_cnpj']),
  category_id: z.string().uuid(),
  confidence: z.number(),
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const KEYWORD_RULES: [string[], string][] = [
  [['uber', '99', 'cabify'], 'Transporte'],
  [['ifood', 'rappi', 'restaurante', 'padaria', 'mercado', 'supermercado', 'lanchonete'], 'Alimentação'],
  [['aluguel', 'condominio', 'iptu', 'conta de luz', 'conta de agua', 'sabesp'], 'Moradia'],
  [['farmacia', 'drogaria', 'medico', 'hospital', 'clinica', 'exame', 'consulta'], 'Saúde'],
  [['netflix', 'spotify', 'prime video', 'cinema', 'teatro', 'show'], 'Lazer'],
  [['salario', 'salário', 'deposito', 'transferencia recebida', 'pix recebido'], 'Salário/Receita'],
  [['amazon', 'mercado livre', 'shopee', 'magazine', 'americanas'], 'Compras'],
  [['escola', 'faculdade', 'curso', 'livraria', 'udemy'], 'Educação'],
  [['corretora', 'acoes', 'fii', 'tesouro', 'investimento'], 'Investimentos'],
];

/**
 * Extract a clean pattern from a transaction description.
 * Removes dates, amounts, and transaction IDs — keeps the merchant name part.
 */
function extractPattern(description: string): string {
  return description
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '')
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/R\$\s*[\d.,]+/gi, '')
    .replace(/\b\d{6,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .is('category_id', null)
      .limit(500);

    if (error) throw error;

    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    if (!categories) throw new Error('No categories found');

    const validCategories = z.array(CategoryRowSchema).parse(categories);
    const categoryMap = new Map(validCategories.map((c) => [c.name, c.id]));
    let categorized = 0;

    for (const tx of transactions ?? []) {
      const validTx = TransactionRowSchema.parse(tx);

      const { data: rules } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', validTx.user_id)
        .order('confidence', { ascending: false });

      let matchedCategoryId: string | null = null;

      for (const rule of rules ?? []) {
        const validRule = CategorizationRuleRowSchema.parse(rule);
        const fieldValue = String(
          validRule.field === 'merchant_name' ? (validTx.merchant_name ?? '')
          : validRule.field === 'merchant_cnpj' ? (validTx.merchant_cnpj ?? '')
          : validTx.description
        ).toLowerCase();
        if (fieldValue.includes(validRule.pattern.toLowerCase())) {
          matchedCategoryId = validRule.category_id;
          break;
        }
      }

      if (!matchedCategoryId && validTx.merchant_cnpj) {
        const { data: cnpjRule, error: cnpjError } = await supabase
          .from('categorization_rules')
          .select('*')
          .eq('pattern', validTx.merchant_cnpj)
          .eq('field', 'merchant_cnpj')
          .maybeSingle();

        if (!cnpjError && cnpjRule) {
          matchedCategoryId = cnpjRule.category_id;
        }
      }

      if (!matchedCategoryId) {
        const desc = (validTx.description + ' ' + (validTx.merchant_name ?? '')).toLowerCase();
        for (const [keywords, categoryName] of KEYWORD_RULES) {
          if (keywords.some((kw) => desc.includes(kw))) {
            matchedCategoryId = categoryMap.get(categoryName) ?? null;
            break;
          }
        }
      }

      if (!matchedCategoryId) {
        matchedCategoryId = categoryMap.get('Outros') ?? null;
      }

      if (matchedCategoryId) {
        await supabase
          .from('transactions')
          .update({ category_id: matchedCategoryId, status: 'categorized' })
          .eq('id', validTx.id);
        categorized++;
      }
    }

    // ==========================================
    // LEARNING: detect user corrections and create/update rules
    // ==========================================
    let rulesCreated = 0;

    const { data: correctedTxs, error: correctedError } = await supabase
      .from('transactions')
      .select('*')
      .not('user_category_id', 'is', null)
      .neq('user_category_id', 'category_id')
      .limit(200);

    if (!correctedError && correctedTxs) {
      for (const tx of correctedTxs) {
        const patternField: 'merchant_cnpj' | 'merchant_name' | 'description' =
          tx.merchant_cnpj ? 'merchant_cnpj'
          : tx.merchant_name ? 'merchant_name'
          : 'description';

        const patternValue =
          patternField === 'merchant_cnpj' ? tx.merchant_cnpj!
          : patternField === 'merchant_name' ? tx.merchant_name!
          : extractPattern(tx.description);

        if (!patternValue || patternValue.trim().length === 0) continue;

        const { data: existingRule } = await supabase
          .from('categorization_rules')
          .select('*')
          .eq('user_id', tx.user_id)
          .eq('pattern', patternValue)
          .eq('field', patternField)
          .maybeSingle();

        if (existingRule) {
          const newConfidence = Math.min(
            Number(existingRule.confidence) + 0.05,
            1.0
          );
          await supabase
            .from('categorization_rules')
            .update({
              confidence: newConfidence,
              hit_count: existingRule.hit_count + 1,
              category_id: tx.user_category_id,
            })
            .eq('id', existingRule.id);
        } else {
          await supabase.from('categorization_rules').insert({
            user_id: tx.user_id,
            pattern: patternValue,
            field: patternField,
            category_id: tx.user_category_id,
            confidence: 0.8,
            hit_count: 1,
          });
          rulesCreated++;
        }

        await supabase
          .from('transactions')
          .update({ category_id: tx.user_category_id, user_category_id: null })
          .eq('id', tx.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, categorized, rulesCreated, total: transactions?.length ?? 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Categorizer error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
