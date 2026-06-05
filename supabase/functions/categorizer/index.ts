import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

serve(async (_req: Request) => {
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

    const categoryMap = new Map(categories.map((c: any) => [c.name, c.id]));
    let categorized = 0;

    for (const tx of transactions ?? []) {
      const { data: rules } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', tx.user_id)
        .order('confidence', { ascending: false });

      let matchedCategoryId: string | null = null;

      // Priority 1: Learned rules
      for (const rule of rules ?? []) {
        const fieldValue = String(
          rule.field === 'merchant_name' ? (tx.merchant_name ?? '')
          : rule.field === 'merchant_cnpj' ? (tx.merchant_cnpj ?? '')
          : tx.description
        ).toLowerCase();
        if (fieldValue.includes(rule.pattern.toLowerCase())) {
          matchedCategoryId = rule.category_id;
          break;
        }
      }

      // Priority 2: CNPJ-based
      if (!matchedCategoryId && tx.merchant_cnpj) {
        const { data: cnpjRule, error: cnpjError } = await supabase
          .from('categorization_rules')
          .select('*')
          .eq('pattern', tx.merchant_cnpj)
          .eq('field', 'merchant_cnpj')
          .maybeSingle();

        if (!cnpjError && cnpjRule) {
          matchedCategoryId = cnpjRule.category_id;
        }
      }

      // Priority 3: Keyword fallback
      if (!matchedCategoryId) {
        const desc = (tx.description + ' ' + (tx.merchant_name ?? '')).toLowerCase();
        for (const [keywords, categoryName] of KEYWORD_RULES) {
          if (keywords.some((kw) => desc.includes(kw))) {
            matchedCategoryId = categoryMap.get(categoryName) ?? null;
            break;
          }
        }
      }

      // Priority 4: Fallback to Outros
      if (!matchedCategoryId) {
        matchedCategoryId = categoryMap.get('Outros') ?? null;
      }

      if (matchedCategoryId) {
        await supabase
          .from('transactions')
          .update({ category_id: matchedCategoryId, status: 'categorized' })
          .eq('id', tx.id);
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
