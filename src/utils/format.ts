/**
 * Format a decimal amount as BRL currency string.
 * amount in reais (e.g., 1234.56 → "R$ 1.234,56")
 */
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format a date string to short Brazilian format.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a date string to relative format (e.g., "Hoje", "Ontem", "3 dias atras").
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return formatDate(dateStr);
}

/**
 * Compute the effective category for a transaction.
 * User override takes priority over automatic categorization.
 */
export function getEffectiveCategory(
  transaction: { categoryId: string | null; userCategoryId: string | null }
): string | null {
  return transaction.userCategoryId ?? transaction.categoryId;
}

/**
 * Determine if a transaction is income (positive amount).
 */
export function isIncome(amount: number): boolean {
  return amount > 0;
}

/**
 * Determine if a transaction is expense (negative amount).
 */
export function isExpense(amount: number): boolean {
  return amount < 0;
}
