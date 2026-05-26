import { create } from 'zustand';
import { supabase } from '../../core/supabase';
import { calculateInvoiceDates } from '../../core/utils';

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'investment' | 'other';
  balance: number;
  icon: string;
  color: string;
}

export interface CreditCard {
  id: string;
  name: string;
  brand: string;
  limit_total: number;
  limit_available: number;
  closing_day: number;
  due_day: number;
  color: string;
}

export interface Invoice {
  id: string;
  credit_card_id: string;
  period: string; // YYYY-MM
  status: 'open' | 'closed' | 'paid';
  due_date: string;
  closing_date: string;
  amount: number;
  paid_amount: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  user_id: string | null;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  credit_card_id: string | null;
  invoice_id: string | null;
  recurrence_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  payment_method: 'credit' | 'debit' | 'pix' | 'cash';
  value: number;
  description: string;
  category_id: string;
  date: string;
  transfer_target_account_id: string | null;
  notes: string | null;
  tags: string[] | null;
}

export interface Installment {
  id: string;
  transaction_id: string;
  installment_number: number;
  total_installments: number;
  value: number;
  invoice_id: string;
  due_date: string;
  status: 'unpaid' | 'paid';
}

export interface Recurrence {
  id: string;
  type: 'income' | 'expense';
  value: number;
  description: string;
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  active: boolean;
}

interface FinanceState {
  accounts: Account[];
  creditCards: CreditCard[];
  invoices: Invoice[];
  categories: Category[];
  transactions: Transaction[];
  installments: Installment[];
  recurrences: Recurrence[];
  loading: boolean;

  fetchData: () => Promise<void>;
  
  // Contas
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Cartões
  addCreditCard: (card: Omit<CreditCard, 'id' | 'limit_available'>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  payInvoice: (invoiceId: string, accountId: string) => Promise<void>;

  // Transações
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'invoice_id'>, 
    installmentsCount?: number
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Categorias
  addCategory: (category: Omit<Category, 'id' | 'user_id'>) => Promise<void>;

  // Recorrências
  addRecurrence: (recurrence: Omit<Recurrence, 'id'>) => Promise<string | null>;
}

// ==========================================
// HELPER: gera transações mensais recorrentes em atraso
// (chamado por fetchData antes do load principal)
// ==========================================
async function generateDueMonthlyRecurrences(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: recurrences, error } = await supabase
      .from('recurrences')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .eq('frequency', 'monthly');

    if (error || !recurrences || recurrences.length === 0) return;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (const r of recurrences) {
      if (r.end_date && new Date(r.end_date) < today) continue;
      // Precisa ter origem: ou conta, ou cartão. Qualquer outra coisa pula.
      if (!r.account_id && !r.credit_card_id) continue;

      // Achar última transação dessa recorrência
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('date')
        .eq('recurrence_id', r.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let anchor: Date;
      if (lastTx?.date) {
        anchor = new Date(lastTx.date);
      } else {
        // Sem filhos ainda — usa start_date como âncora "do mês anterior"
        // pra que o primeiro avanço caia na própria start_date
        anchor = new Date(r.start_date + 'T12:00:00');
        anchor.setMonth(anchor.getMonth() - 1);
      }

      const nextDate = new Date(anchor);
      nextDate.setMonth(nextDate.getMonth() + 1);

      while (nextDate <= today) {
        const txValue = Number(r.value);
        const isCreditRec = !!r.credit_card_id;

        if (isCreditRec) {
          // ===== RECORRÊNCIA EM CARTÃO DE CRÉDITO =====
          // (assinaturas: Netflix, Spotify etc — cobrança única mensal, sem parcelas)
          const { data: card } = await supabase
            .from('credit_cards')
            .select('id, limit_total, limit_available, closing_day, due_day')
            .eq('id', r.credit_card_id)
            .maybeSingle();
          if (!card) {
            console.warn('Recorrência aponta pra cartão inexistente:', r.id);
            break;
          }

          const { period, closingDate, dueDate } = calculateInvoiceDates(
            nextDate,
            card.closing_day,
            card.due_day
          );

          // Achar/criar fatura do período
          let invoiceId: string;
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id, amount')
            .eq('credit_card_id', card.id)
            .eq('period', period)
            .maybeSingle();

          if (existingInvoice) {
            invoiceId = existingInvoice.id;
            await supabase
              .from('invoices')
              .update({ amount: Number(existingInvoice.amount) + txValue })
              .eq('id', invoiceId);
          } else {
            const { data: newInvoice, error: invErr } = await supabase
              .from('invoices')
              .insert([{
                credit_card_id: card.id,
                period,
                status: 'open',
                due_date: dueDate.toISOString().split('T')[0],
                closing_date: closingDate.toISOString().split('T')[0],
                amount: txValue,
              }])
              .select()
              .single();
            if (invErr || !newInvoice) {
              console.error('Falha criando fatura pra recorrência:', invErr);
              break;
            }
            invoiceId = newInvoice.id;
          }

          // Inserir transação já vinculada à fatura
          const { error: insErr } = await supabase.from('transactions').insert([{
            user_id: user.id,
            recurrence_id: r.id,
            account_id: null,
            credit_card_id: card.id,
            invoice_id: invoiceId,
            type: r.type,
            payment_method: 'credit',
            value: txValue,
            description: r.description,
            category_id: r.category_id,
            date: nextDate.toISOString(),
            transfer_target_account_id: null,
            notes: 'Assinatura recorrente automática',
            tags: null,
          }]);
          if (insErr) {
            console.error('Falha ao gerar tx recorrente em crédito:', insErr);
            break;
          }

          // Reduzir limite disponível do cartão
          const newLimitAvailable = Number(card.limit_available) - txValue;
          await supabase
            .from('credit_cards')
            .update({ limit_available: newLimitAvailable })
            .eq('id', card.id);

        } else {
          // ===== RECORRÊNCIA EM CONTA (débito/pix/dinheiro) =====
          const { error: insErr } = await supabase.from('transactions').insert([{
            user_id: user.id,
            recurrence_id: r.id,
            account_id: r.account_id,
            credit_card_id: null,
            invoice_id: null,
            type: r.type,
            payment_method: 'debit',
            value: txValue,
            description: r.description,
            category_id: r.category_id,
            date: nextDate.toISOString(),
            transfer_target_account_id: null,
            notes: 'Lançamento recorrente automático',
            tags: null,
          }]);

          if (insErr) {
            console.error('Falha ao gerar tx recorrente em conta:', insErr);
            break;
          }

          // Reajustar saldo da conta
          const { data: acc } = await supabase
            .from('accounts')
            .select('balance')
            .eq('id', r.account_id)
            .maybeSingle();
          if (acc) {
            const currentBalance = Number(acc.balance);
            const newBalance = r.type === 'income' ? currentBalance + txValue : currentBalance - txValue;
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', r.account_id);
          }
        }

        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }
  } catch (err) {
    console.error('Erro no gerador de recorrências:', err);
  }
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  creditCards: [],
  invoices: [],
  categories: [],
  transactions: [],
  installments: [],
  recurrences: [],
  loading: false,

  fetchData: async () => {
    set({ loading: true });
    try {
      // Antes de carregar, gerar transações recorrentes mensais em atraso
      await generateDueMonthlyRecurrences();

      const [
        { data: accounts },
        { data: creditCards },
        { data: invoices },
        { data: categories },
        { data: transactions },
        { data: installments },
        { data: recurrences },
      ] = await Promise.all([
        supabase.from('accounts').select('*').order('name'),
        supabase.from('credit_cards').select('*').order('name'),
        supabase.from('invoices').select('*').order('period'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('installments').select('*').order('due_date'),
        supabase.from('recurrences').select('*').order('created_at'),
      ]);

      set({
        accounts: accounts ? accounts.map(a => ({ ...a, balance: Number(a.balance) })) : [],
        creditCards: creditCards ? creditCards.map(c => ({ ...c, limit_total: Number(c.limit_total), limit_available: Number(c.limit_available) })) : [],
        invoices: invoices ? invoices.map(i => ({ ...i, amount: Number(i.amount), paid_amount: Number(i.paid_amount) })) : [],
        categories: categories || [],
        transactions: transactions ? transactions.map(t => ({ ...t, value: Number(t.value) })) : [],
        installments: installments ? installments.map(inst => ({ ...inst, value: Number(inst.value) })) : [],
        recurrences: recurrences ? recurrences.map(r => ({ ...r, value: Number(r.value) })) : [],
      });
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      set({ loading: false });
    }
  },

  // ==========================================
  // CONTAS
  // ==========================================
  addAccount: async (accountData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('accounts')
        .insert([{ ...accountData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        accounts: [...state.accounts, { ...data, balance: Number(data.balance) }].sort((a, b) => a.name.localeCompare(b.name)),
      }));
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      throw error;
    }
  },

  deleteAccount: async (id) => {
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
      }));
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      throw error;
    }
  },

  // ==========================================
  // CARTÕES DE CRÉDITO & FATURAS
  // ==========================================
  addCreditCard: async (cardData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('credit_cards')
        .insert([{ 
          ...cardData, 
          user_id: user.id,
          limit_available: cardData.limit_total // Inicialmente limite disponível = total
        }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        creditCards: [...state.creditCards, { ...data, limit_total: Number(data.limit_total), limit_available: Number(data.limit_available) }],
      }));
    } catch (error) {
      console.error('Erro ao adicionar cartão:', error);
      throw error;
    }
  },

  deleteCreditCard: async (id) => {
    try {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        creditCards: state.creditCards.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error('Erro ao deletar cartão:', error);
      throw error;
    }
  },

  payInvoice: async (invoiceId, accountId) => {
    try {
      const invoice = get().invoices.find(i => i.id === invoiceId);
      const account = get().accounts.find(a => a.id === accountId);
      if (!invoice || !account) return;

      const creditCard = get().creditCards.find(c => c.id === invoice.credit_card_id);
      if (!creditCard) return;

      const payAmount = invoice.amount - invoice.paid_amount;
      if (payAmount <= 0) return;

      // 1. Atualizar saldo da conta no banco
      const newAccountBalance = account.balance - payAmount;
      const { error: accError } = await supabase
        .from('accounts')
        .update({ balance: newAccountBalance })
        .eq('id', accountId);
      if (accError) throw accError;

      // 2. Atualizar limite disponível do cartão no banco
      const newLimitAvailable = Math.min(creditCard.limit_total, creditCard.limit_available + payAmount);
      const { error: cardError } = await supabase
        .from('credit_cards')
        .update({ limit_available: newLimitAvailable })
        .eq('id', creditCard.id);
      if (cardError) throw cardError;

      // 3. Atualizar status da fatura
      const { error: invError } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_amount: invoice.amount })
        .eq('id', invoiceId);
      if (invError) throw invError;

      // 4. Marcar todas as parcelas (installments) dessa fatura como pagas
      const { error: instError } = await supabase
        .from('installments')
        .update({ status: 'paid' })
        .eq('invoice_id', invoiceId);
      if (instError) throw instError;

      // 5. Registrar transação de pagamento de fatura no histórico para controle do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Encontrar categoria de despesas com cartão ou criar uma geral
        const category = get().categories.find(c => c.name === 'Outras Despesas' && c.type === 'expense');
        await supabase.from('transactions').insert([{
          user_id: user.id,
          account_id: accountId,
          type: 'expense',
          payment_method: 'debit',
          value: payAmount,
          description: `Pagamento fatura ${creditCard.name}`,
          category_id: category?.id,
          date: new Date().toISOString(),
          notes: `Fatura referente ao período ${invoice.period}`
        }]);
      }

      // Recarregar os dados para atualizar as stores e UI de forma consistente
      await get().fetchData();
    } catch (error) {
      console.error('Erro ao pagar fatura:', error);
      throw error;
    }
  },

  // ==========================================
  // TRANSAÇÕES
  // ==========================================
  addTransaction: async (txData, installmentsCount = 1) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const txValue = Number(txData.value);

      // CASO 1: Transação no Cartão de Crédito
      if (txData.payment_method === 'credit' && txData.credit_card_id) {
        const card = get().creditCards.find(c => c.id === txData.credit_card_id);
        if (!card) throw new Error('Cartão não encontrado');

        // A. Reduzir limite disponível do cartão
        const newLimitAvailable = card.limit_available - txValue;
        const { error: limitError } = await supabase
          .from('credit_cards')
          .update({ limit_available: newLimitAvailable })
          .eq('id', card.id);
        if (limitError) throw limitError;

        // B. Criar a transação mãe
        const { data: tx, error: txError } = await supabase
          .from('transactions')
          .insert([{ 
            ...txData, 
            user_id: user.id,
            notes: installmentsCount > 1 ? `Compra parcelada em ${installmentsCount}x` : txData.notes
          }])
          .select()
          .single();
        if (txError) throw txError;

        // C. Lógica de Parcelas e Faturas
        const purchaseDate = new Date(txData.date);

        if (installmentsCount > 1) {
          // COMPRA PARCELADA
          const installmentValue = Number((txValue / installmentsCount).toFixed(2));
          const lastInstallmentValue = Number((txValue - (installmentValue * (installmentsCount - 1))).toFixed(2));

          for (let i = 1; i <= installmentsCount; i++) {
            // Calcular data de vencimento da parcela i
            const instDate = new Date(purchaseDate);
            instDate.setMonth(purchaseDate.getMonth() + (i - 1));

            // Calcular período da fatura correspondente para esta parcela
            const { period, closingDate, dueDate } = calculateInvoiceDates(instDate, card.closing_day, card.due_day);
            const val = i === installmentsCount ? lastInstallmentValue : installmentValue;

            // Encontrar ou criar a fatura para o período correspondente
            let invoiceId = '';
            const { data: existingInvoice } = await supabase
              .from('invoices')
              .select('*')
              .eq('credit_card_id', card.id)
              .eq('period', period)
              .maybeSingle();

            if (existingInvoice) {
              invoiceId = existingInvoice.id;
              // Somar o valor da parcela no total da fatura
              await supabase
                .from('invoices')
                .update({ amount: Number(existingInvoice.amount) + val })
                .eq('id', invoiceId);
            } else {
              // Criar nova fatura
              const { data: newInvoice, error: invError } = await supabase
                .from('invoices')
                .insert([{
                  credit_card_id: card.id,
                  period,
                  status: 'open',
                  due_date: dueDate.toISOString().split('T')[0],
                  closing_date: closingDate.toISOString().split('T')[0],
                  amount: val
                }])
                .select()
                .single();
              if (invError) throw invError;
              invoiceId = newInvoice.id;
            }

            // Inserir a parcela (installment)
            await supabase.from('installments').insert([{
              transaction_id: tx.id,
              installment_number: i,
              total_installments: installmentsCount,
              value: val,
              invoice_id: invoiceId,
              due_date: dueDate.toISOString().split('T')[0],
              status: 'unpaid'
            }]);
          }
        } else {
          // COMPRA À VISTA NO CRÉDITO
          const { period, closingDate, dueDate } = calculateInvoiceDates(purchaseDate, card.closing_day, card.due_day);
          
          let invoiceId = '';
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('credit_card_id', card.id)
            .eq('period', period)
            .maybeSingle();

          if (existingInvoice) {
            invoiceId = existingInvoice.id;
            await supabase
              .from('invoices')
              .update({ amount: Number(existingInvoice.amount) + txValue })
              .eq('id', invoiceId);
          } else {
            const { data: newInvoice, error: invError } = await supabase
              .from('invoices')
              .insert([{
                credit_card_id: card.id,
                period,
                status: 'open',
                due_date: dueDate.toISOString().split('T')[0],
                closing_date: closingDate.toISOString().split('T')[0],
                amount: txValue
              }])
              .select()
              .single();
            if (invError) throw invError;
            invoiceId = newInvoice.id;
          }

          // Atualizar transação para vincular a invoice_id
          await supabase
            .from('transactions')
            .update({ invoice_id: invoiceId })
            .eq('id', tx.id);
        }

      } else {
        // CASO 2: Transação em Conta Corrente/Dinheiro (Não Crédito)
        if (!txData.account_id) throw new Error('Conta não informada');
        const account = get().accounts.find(a => a.id === txData.account_id);
        if (!account) throw new Error('Conta não encontrada');

        let newBalance = account.balance;

        if (txData.type === 'income') {
          newBalance += txValue;
        } else if (txData.type === 'expense') {
          newBalance -= txValue;
        } else if (txData.type === 'transfer' && txData.transfer_target_account_id) {
          // A. Deduz da conta de origem
          newBalance -= txValue;

          // B. Adiciona na conta de destino
          const destAccount = get().accounts.find(a => a.id === txData.transfer_target_account_id);
          if (destAccount) {
            await supabase
              .from('accounts')
              .update({ balance: destAccount.balance + txValue })
              .eq('id', txData.transfer_target_account_id);
          }
        }

        // Atualizar saldo no banco
        const { error: accError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', account.id);
        if (accError) throw accError;

        // Criar transação
        const { error: txError } = await supabase
          .from('transactions')
          .insert([{ ...txData, user_id: user.id }]);
        if (txError) throw txError;
      }

      // Recarregar os dados locais
      await get().fetchData();
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const tx = get().transactions.find(t => t.id === id);
      if (!tx) return;

      const txValue = Number(tx.value);

      // CASO 1: Transação no Cartão de Crédito
      if (tx.payment_method === 'credit' && tx.credit_card_id) {
        const card = get().creditCards.find(c => c.id === tx.credit_card_id);
        if (!card) throw new Error('Cartão não encontrado');

        // Restabelecer limite disponível do cartão
        const newLimitAvailable = Math.min(card.limit_total, card.limit_available + txValue);
        await supabase
          .from('credit_cards')
          .update({ limit_available: newLimitAvailable })
          .eq('id', card.id);

        // Se era parcelado, precisamos deletar parcelas e reajustar faturas
        const { data: insts } = await supabase
          .from('installments')
          .select('*')
          .eq('transaction_id', tx.id);

        if (insts && insts.length > 0) {
          // Deletar as parcelas e ajustar cada fatura relacionada
          for (const inst of insts) {
            const invoice = get().invoices.find(i => i.id === inst.invoice_id);
            if (invoice) {
              const newAmount = Math.max(0, invoice.amount - Number(inst.value));
              await supabase
                .from('invoices')
                .update({ amount: newAmount })
                .eq('id', invoice.id);
            }
          }
          await supabase.from('installments').delete().eq('transaction_id', tx.id);
        } else if (tx.invoice_id) {
          // Era à vista, deduz o valor da fatura única
          const invoice = get().invoices.find(i => i.id === tx.invoice_id);
          if (invoice) {
            const newAmount = Math.max(0, invoice.amount - txValue);
            await supabase
              .from('invoices')
              .update({ amount: newAmount })
              .eq('id', invoice.id);
          }
        }
      } else {
        // CASO 2: Transação em Conta Corrente/Dinheiro
        if (tx.account_id) {
          const account = get().accounts.find(a => a.id === tx.account_id);
          if (account) {
            let newBalance = account.balance;
            if (tx.type === 'income') {
              newBalance -= txValue;
            } else if (tx.type === 'expense') {
              newBalance += txValue;
            } else if (tx.type === 'transfer' && tx.transfer_target_account_id) {
              newBalance += txValue; // Restaura origem

              const destAccount = get().accounts.find(a => a.id === tx.transfer_target_account_id);
              if (destAccount) {
                await supabase
                  .from('accounts')
                  .update({ balance: destAccount.balance - txValue })
                  .eq('id', tx.transfer_target_account_id);
              }
            }
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', account.id);
          }
        }
      }

      // Deletar transação do banco
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;

      await get().fetchData();
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      throw error;
    }
  },

  // ==========================================
  // RECORRÊNCIAS
  // ==========================================
  addRecurrence: async (recurrenceData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('recurrences')
        .insert([{ ...recurrenceData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        recurrences: [...state.recurrences, { ...data, value: Number(data.value) }],
      }));
      return data.id;
    } catch (error) {
      console.error('Erro ao criar recorrência:', error);
      return null;
    }
  },

  // ==========================================
  // CATEGORIAS
  // ==========================================
  addCategory: async (categoryData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .insert([{ ...categoryData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        categories: [...state.categories, data],
      }));
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
      throw error;
    }
  },
}));
