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
        const { data: cnpjRule } = await supabase
          .from('categorization_rules')
          .select('*')
          .eq('pattern', tx.merchant_cnpj)
          .eq('field', 'merchant_cnpj')
          .single();
        if (cnpjRule) matchedCategoryId = cnpjRule.category_id;
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

    return new Response(
      JSON.stringify({ success: true, categorized, total: transactions?.length ?? 0 }),
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
