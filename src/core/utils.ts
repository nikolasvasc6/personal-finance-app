// Funções utilitárias financeiras e auxiliares do App

/**
 * Formata um valor numérico para a moeda brasileira (R$)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata uma data no formato legível pt-BR (DD/MM/AAAA)
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

/**
 * Retorna o nome abreviado do mês em português (ex: Mai, Jun)
 */
export function formatMonthShort(period: string): string {
  // period format: 'YYYY-MM'
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
}

/**
 * Retorna o nome completo do mês em português (ex: Maio de 2026)
 */
export function formatMonthFull(period: string): string {
  // period format: 'YYYY-MM'
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

interface InvoiceDates {
  period: string;       // Formato 'YYYY-MM'
  closingDate: Date;
  dueDate: Date;
}

/**
 * Calcula a fatura correta para uma compra com base nas regras de fechamento e vencimento do cartão.
 * @param purchaseDate Data em que a compra está sendo realizada
 * @param closingDay Dia do fechamento da fatura (ex: 10)
 * @param dueDay Dia do vencimento da fatura (ex: 17)
 */
export function calculateInvoiceDates(purchaseDate: Date, closingDay: number, dueDay: number): InvoiceDates {
  const date = new Date(purchaseDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (Janeiro = 0)
  const day = date.getDate();

  let targetYear = year;
  let targetMonth = month; // O mês em que a fatura vence

  if (day >= closingDay) {
    // Se o dia da compra é maior ou igual ao dia de fechamento, cai na fatura do próximo mês
    targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear = year + 1;
    }
  }

  // Criar data de vencimento da fatura.
  // Tratamos o caso do dia exceder o limite do mês (ex: 31 de Fevereiro)
  let dueDate = new Date(targetYear, targetMonth, dueDay);
  // Se o mês gerado for diferente do targetMonth, retrocedemos dias até ajustar
  while (dueDate.getMonth() !== targetMonth) {
    dueDate.setDate(dueDate.getDate() - 1);
  }

  // A data de fechamento é no mesmo mês do vencimento ou no mês anterior?
  // Normalmente, o fechamento ocorre X dias antes do vencimento. No nosso caso, o closingDay é o dia de fechamento.
  // Se o closingDay for maior que o dueDay, significa que a fatura fecha no mês anterior ao de vencimento.
  // Exemplo: fecha dia 28 do mês anterior e vence dia 5 do mês atual.
  let closingMonth = targetMonth;
  let closingYear = targetYear;

  if (closingDay > dueDay) {
    closingMonth = targetMonth - 1;
    if (closingMonth < 0) {
      closingMonth = 11;
      closingYear = targetYear - 1;
    }
  }

  let closingDate = new Date(closingYear, closingMonth, closingDay);
  while (closingDate.getMonth() !== closingMonth) {
    closingDate.setDate(closingDate.getDate() - 1);
  }

  // O período de referência da fatura é baseado no mês/ano de vencimento
  const formattedMonth = String(targetMonth + 1).padStart(2, '0');
  const period = `${targetYear}-${formattedMonth}`;

  return {
    period,
    closingDate,
    dueDate,
  };
}
