import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownRight, CreditCard, ChevronRight, Wallet, HelpCircle, RefreshCcw } from 'lucide-react-native';
import { useFinanceStore, Invoice, CreditCard as CreditCardType } from '../../shared/store/useFinanceStore';
import { useAuthStore } from '../../shared/store/useAuthStore';
import { formatCurrency, formatMonthFull } from '../../core/utils';
import { COLORS } from '../../core/theme';
import { PieChart } from '../../shared/components/PieChart';
import { LineChart } from '../../shared/components/LineChart';
import { QuickTransactionModal } from '../transactions/QuickTransactionModal';
import { Card } from '../../shared/components/Card';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { InvoiceDetailModal } from '../accounts/InvoiceDetailModal';

export const DashboardScreen: React.FC = () => {
  const { profile } = useAuthStore();
  const {
    accounts,
    creditCards,
    invoices,
    transactions,
    installments,
    categories,
    fetchData,
    loading
  } = useFinanceStore();

  const [hideValues, setHideValues] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [invoiceDetail, setInvoiceDetail] = useState<{ invoice: Invoice; card: CreditCardType } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    fetchData();
  };

  // Cálculos financeiros gerais
  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  // Filtrar transações do mês atual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Receitas: tx de income do mês atual (por data)
  const totalIncomes = transactions
    .filter((t) => {
      if (t.type !== 'income') return false;
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((acc, curr) => acc + curr.value, 0);

  // ============================================
  // Despesas do mês corrente =
  //   (tx em débito/pix/cash do mês, exceto a tx-espelho de "Pagamento fatura")
  // + (sum invoice.amount onde invoice.status === 'open' — a "Fatura Atual" de cada cartão)
  // ============================================
  const isInvoicePayment = (tx: { notes: string | null; description: string }) =>
    !!tx.notes?.includes('Fatura referente ao período') ||
    tx.description.toLowerCase().startsWith('pagamento fatura');

  // Lançamentos não-crédito do mês corrente (cada um vira linha do piechart)
  const nonCreditLines: { value: number; categoryId: string }[] = [];
  let nonCreditTotal = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.payment_method === 'credit') continue;
    if (isInvoicePayment(tx)) continue;
    const d = new Date(tx.date);
    if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) continue;
    nonCreditTotal += tx.value;
    nonCreditLines.push({ value: tx.value, categoryId: tx.category_id });
  }

  // "Fatura Atual" de cada cartão = a invoice aberta com o period mais antigo.
  // (Compras parceladas criam várias invoices abertas futuras; só a próxima a
  //  fechar deve contar como despesa do mês corrente.)
  const currentInvoiceByCard = new Map<string, typeof invoices[number]>();
  for (const inv of invoices) {
    if (inv.status !== 'open') continue;
    const existing = currentInvoiceByCard.get(inv.credit_card_id);
    if (!existing || inv.period < existing.period) {
      currentInvoiceByCard.set(inv.credit_card_id, inv);
    }
  }
  const currentOpenInvoices = Array.from(currentInvoiceByCard.values());
  const openInvoiceIds = new Set(currentOpenInvoices.map((i) => i.id));
  const openInvoicesTotal = currentOpenInvoices.reduce((a, c) => a + c.amount, 0);

  const totalExpenses = nonCreditTotal + openInvoicesTotal;
  const savings = totalIncomes - totalExpenses;

  // Detalhamento pra piechart: expande as faturas abertas em tx-à-vista + installments
  // para ter categorias. Se houver discrepância vs invoice.amount, atribui a diferença
  // a "Outras Despesas" pra fechar.
  const txIdsWithInstallments = new Set(installments.map((i) => i.transaction_id));
  const creditLines: { value: number; categoryId: string }[] = [];
  let creditBreakdown = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.payment_method !== 'credit') continue;
    if (txIdsWithInstallments.has(tx.id)) continue;
    if (!tx.invoice_id || !openInvoiceIds.has(tx.invoice_id)) continue;
    creditBreakdown += tx.value;
    creditLines.push({ value: tx.value, categoryId: tx.category_id });
  }
  for (const inst of installments) {
    if (!openInvoiceIds.has(inst.invoice_id)) continue;
    const parent = transactions.find((t) => t.id === inst.transaction_id);
    if (!parent) continue;
    creditBreakdown += inst.value;
    creditLines.push({ value: inst.value, categoryId: parent.category_id });
  }
  const diff = openInvoicesTotal - creditBreakdown;
  if (diff > 0.01) {
    const fallback = categories.find(
      (c) => c.name === 'Outras Despesas' && c.type === 'expense'
    );
    creditLines.push({ value: diff, categoryId: fallback?.id ?? '' });
  }

  const expensesByCategory = [...nonCreditLines, ...creditLines].reduce(
    (acc: { [key: string]: { name: string; value: number; color: string } }, curr) => {
      const cat = categories.find((c) => c.id === curr.categoryId);
      const catName = cat?.name || 'Outras Despesas';
      const catColor = cat?.color || COLORS.foregroundMuted;
      if (!acc[catName]) acc[catName] = { name: catName, value: 0, color: catColor };
      acc[catName].value += curr.value;
      return acc;
    },
    {}
  );
  const pieChartData = Object.values(expensesByCategory);

  // Evolução mensal (6 meses) — histórico usa fatura cujo period === aquele mês
  // (faturas antigas já estão fechadas/pagas com period correto)
  const getEvolutionData = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const period = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      const isCurrent = yr === currentYear && mIdx === currentMonth;

      const monthIncomes = transactions
        .filter((t) => {
          if (t.type !== 'income') return false;
          const td = new Date(t.date);
          return td.getFullYear() === yr && td.getMonth() === mIdx;
        })
        .reduce((acc, curr) => acc + curr.value, 0);

      let monthExpenses = 0;
      for (const tx of transactions) {
        if (tx.type !== 'expense') continue;
        if (tx.payment_method === 'credit') continue;
        if (isInvoicePayment(tx)) continue;
        const td = new Date(tx.date);
        if (td.getFullYear() === yr && td.getMonth() === mIdx) {
          monthExpenses += tx.value;
        }
      }
      if (isCurrent) {
        monthExpenses += openInvoicesTotal;
      } else {
        monthExpenses += invoices
          .filter((iv) => iv.period === period)
          .reduce((a, c) => a + c.amount, 0);
      }

      data.push({ label: months[mIdx], value: monthIncomes - monthExpenses });
    }
    return data;
  };

  const lineChartData = getEvolutionData();

  // Fatura aberta atual mais cara
  const openInvoices = invoices.filter(i => i.status === 'open');
  const totalOpenInvoicesAmount = openInvoices.reduce((acc, curr) => acc + curr.amount, 0);

  const openQuickTx = (type: 'income' | 'expense' | 'transfer') => {
    setModalDefaultType(type);
    setModalVisible(true);
  };

  return (
    <ScreenBackground>
      <ScrollView
        className="flex-1 px-5 pt-12"
        style={{ backgroundColor: 'transparent' }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <View className="flex-row items-center">
            <View className="w-11 h-11 bg-white/70 border border-primary/30 rounded-full items-center justify-center mr-3">
              <Text className="text-primary font-bold text-lg">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text className="text-foreground-muted text-xs font-semibold uppercase tracking-wider">Bem-vindo</Text>
              <Text className="text-foreground text-base font-bold">{profile?.full_name || 'Usuário'}</Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setHideValues(!hideValues)}
              className="bg-white/70 border border-white/80 p-2.5 rounded-full"
            >
              {hideValues ? <EyeOff size={20} color={COLORS.foreground} /> : <Eye size={20} color={COLORS.foreground} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRefresh}
              className="bg-white/70 border border-white/80 p-2.5 rounded-full"
            >
              <RefreshCcw size={20} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Saldo Geral — gradiente azul de destaque */}
        <Card variant="gradient" className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white/80 text-sm font-semibold uppercase tracking-wider">Saldo Total Disponível</Text>
            <Wallet size={16} color="#FFFFFF" />
          </View>
          <Text className="text-white text-3xl font-black tracking-tight my-1">
            {hideValues ? '••••••' : formatCurrency(totalBalance)}
          </Text>

          <View className="flex-row gap-3 border-t border-white/20 pt-4 mt-3">
            <View className="flex-1 items-start">
              <Text className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mb-1">Receitas</Text>
              <Text
                className="text-white text-sm font-bold"
                numberOfLines={1}
              >
                {hideValues ? '••••' : `+ ${formatCurrency(totalIncomes)}`}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mb-1">Despesas</Text>
              <Text
                className="text-white text-sm font-bold"
                numberOfLines={1}
              >
                {hideValues ? '••••' : `- ${formatCurrency(totalExpenses)}`}
              </Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mb-1">Economia</Text>
              <Text
                className="text-white text-sm font-bold"
                numberOfLines={1}
              >
                {hideValues ? '••••' : formatCurrency(savings)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Atalhos Rápidos */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openQuickTx('expense')}
            className="flex-1 bg-white/80 border border-white/70 p-4 rounded-2xl flex-row items-center justify-center"
          >
            <ArrowDownRight size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
            <Text className="text-foreground font-bold text-xs">Pagar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openQuickTx('income')}
            className="flex-1 bg-white/80 border border-white/70 p-4 rounded-2xl flex-row items-center justify-center"
          >
            <ArrowUpRight size={20} color={COLORS.success} style={{ marginRight: 8 }} />
            <Text className="text-foreground font-bold text-xs">Receber</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openQuickTx('transfer')}
            className="flex-1 bg-white/80 border border-white/70 p-4 rounded-2xl flex-row items-center justify-center"
          >
            <Plus size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text className="text-foreground font-bold text-xs">Transferir</Text>
          </TouchableOpacity>
        </View>

      {/* Cartões de Crédito / Faturas */}
      {creditCards.length > 0 && (
        <Card variant="glass" className="mb-6" onPress={() => {}}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <CreditCard size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text className="text-foreground font-bold text-sm">Fatura Aberta Total</Text>
            </View>
            <Text className="text-foreground-muted text-xs font-semibold">Ver detalhes</Text>
          </View>
          <Text className="text-foreground text-2xl font-black mb-2">
            {hideValues ? '••••••' : formatCurrency(totalOpenInvoicesAmount)}
          </Text>

          {/* Limite de Cartão barra de progresso cumulativo — clicável pra ver resumo da fatura aberta */}
          {creditCards.map(c => {
            const limitUsed = c.limit_total - c.limit_available;
            const percentageUsed = c.limit_total > 0 ? (limitUsed / c.limit_total) * 100 : 0;
            const cardOpenInvoice = invoices.find(i => i.credit_card_id === c.id && i.status === 'open');
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={cardOpenInvoice ? 0.7 : 1}
                onPress={() => cardOpenInvoice && setInvoiceDetail({ invoice: cardOpenInvoice, card: c })}
                className="mt-3"
              >
                <View className="flex-row justify-between mb-1">
                  <Text className="text-foreground-muted text-xs">{c.name}</Text>
                  <Text className="text-foreground text-xs font-bold">
                    Disp: {hideValues ? '••••' : formatCurrency(c.limit_available)}
                  </Text>
                </View>
                {/* Progress Bar */}
                <View className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${percentageUsed}%` }}
                  />
                </View>
                {cardOpenInvoice && (
                  <Text className="text-primary text-[10px] font-bold mt-1 uppercase tracking-wider">
                    Ver resumo da fatura
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </Card>
      )}

      {/* Gráfico de Evolução Financeira */}
      <Card variant="glass" className="mb-6">
        <Text className="text-foreground font-bold text-base mb-4">Fluxo de Caixa (Últimos 6 meses)</Text>
        <LineChart data={lineChartData} width={310} height={140} />
      </Card>

      {/* Gráfico de Gastos por Categoria */}
      {pieChartData.length > 0 && (
        <Card variant="glass" className="mb-6">
          <Text className="text-foreground font-bold text-base mb-2">Gastos por Categoria</Text>
          <PieChart data={pieChartData} size={150} />
        </Card>
      )}

      {/* Últimas Transações */}
      <View className="mb-14">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground font-bold text-lg">Atividades Recentes</Text>
          <TouchableOpacity>
            <Text className="text-primary font-bold text-sm">Ver tudo</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3">
          {transactions.slice(0, 4).map((tx) => {
            const cat = categories.find(c => c.id === tx.category_id);
            const isExpense = tx.type === 'expense';
            return (
              <View
                key={tx.id}
                className="flex-row items-center justify-between bg-white/80 border border-white/70 p-4 rounded-2xl mb-2"
              >
                <View className="flex-row items-center flex-1 pr-4">
                  <View 
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${cat?.color || COLORS.primary}15` }}
                  >
                    <Text style={{ color: cat?.color || COLORS.primary, fontSize: 16 }}>
                      {isExpense ? '↓' : (tx.type === 'transfer' ? '⇄' : '↑')}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-bold text-sm truncate" numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text className="text-foreground-muted text-xs mt-0.5">
                      {cat?.name || 'Geral'} • {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
                
                <Text className={`font-extrabold text-sm ${isExpense ? 'text-foreground' : 'text-success'}`}>
                  {isExpense ? '-' : '+'} {formatCurrency(tx.value)}
                </Text>
              </View>
            );
          })}
          {transactions.length === 0 && (
            <View className="items-center py-8">
              <HelpCircle size={32} color={COLORS.foregroundMuted} />
              <Text className="text-foreground-muted text-sm mt-2">Nenhuma transação cadastrada</Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal de Transação Rápida */}
      <QuickTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        defaultType={modalDefaultType}
      />

      {/* Resumo de Fatura */}
      <InvoiceDetailModal
        visible={!!invoiceDetail}
        onClose={() => setInvoiceDetail(null)}
        invoice={invoiceDetail?.invoice ?? null}
        card={invoiceDetail?.card ?? null}
      />
      </ScrollView>
    </ScreenBackground>
  );
};
