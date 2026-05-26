import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Calendar, CheckCircle2, Clock, Receipt, Repeat } from 'lucide-react-native';
import { Modal } from '../../shared/components/Modal';
import { useFinanceStore, Invoice, CreditCard } from '../../shared/store/useFinanceStore';
import { formatCurrency, formatDate, formatMonthFull } from '../../core/utils';
import { COLORS } from '../../core/theme';

interface InvoiceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  card: CreditCard | null;
}

// Uma linha da fatura pode ser:
//   - transação direta (compra à vista no crédito, ou recorrência: invoice_id === invoice.id)
//   - parcela individual (installments.invoice_id === invoice.id), mostrando a tx mãe
type InvoiceLine = {
  key: string;
  date: string;
  description: string;
  categoryId: string;
  value: number;
  installmentLabel: string | null;  // "2/12" quando for parcela
  isRecurrent: boolean;
};

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  visible,
  onClose,
  invoice,
  card,
}) => {
  const { transactions, installments, categories } = useFinanceStore();

  const lines: InvoiceLine[] = useMemo(() => {
    if (!invoice) return [];

    const result: InvoiceLine[] = [];

    // Tx mães de compras parceladas não devem ser contabilizadas: o valor real
    // já está distribuído nas parcelas. Marcamos quais tx têm parcelas.
    const txIdsWithInstallments = new Set(installments.map((i) => i.transaction_id));

    // 1. Transações diretamente vinculadas à fatura (à vista no crédito + recorrências)
    for (const tx of transactions) {
      if (tx.invoice_id !== invoice.id) continue;
      if (txIdsWithInstallments.has(tx.id)) continue;
      result.push({
        key: `tx-${tx.id}`,
        date: tx.date,
        description: tx.description,
        categoryId: tx.category_id,
        value: tx.value,
        installmentLabel: null,
        isRecurrent: !!tx.recurrence_id,
      });
    }

    // 2. Parcelas desta fatura — buscar tx mãe pra herdar descrição/categoria
    for (const inst of installments) {
      if (inst.invoice_id !== invoice.id) continue;
      const parentTx = transactions.find((t) => t.id === inst.transaction_id);
      if (!parentTx) continue;
      result.push({
        key: `inst-${inst.id}`,
        date: inst.due_date,
        description: parentTx.description,
        categoryId: parentTx.category_id,
        value: inst.value,
        installmentLabel: `${inst.installment_number}/${inst.total_installments}`,
        isRecurrent: false,
      });
    }

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [invoice, transactions, installments]);

  if (!invoice || !card) return null;

  const remaining = invoice.amount - invoice.paid_amount;
  const statusMeta = {
    open:   { label: 'ABERTA',  color: COLORS.warning, Icon: Clock },
    closed: { label: 'FECHADA', color: COLORS.danger,  Icon: Receipt },
    paid:   { label: 'PAGA',    color: COLORS.success, Icon: CheckCircle2 },
  }[invoice.status];
  const StatusIcon = statusMeta.Icon;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Fatura — ${card.name}`}
    >
      {/* Cabeçalho colorido com tema do cartão */}
      <View
        className="rounded-2xl p-5 mb-5"
        style={{ backgroundColor: `${card.color}20`, borderWidth: 1, borderColor: `${card.color}55` }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Calendar size={14} color={card.color} />
            <Text className="text-white text-xs font-bold uppercase tracking-wider ml-2">
              {formatMonthFull(invoice.period)}
            </Text>
          </View>
          <View
            className="flex-row items-center px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${statusMeta.color}25` }}
          >
            <StatusIcon size={11} color={statusMeta.color} />
            <Text className="text-[10px] font-extrabold ml-1.5 tracking-wider" style={{ color: statusMeta.color }}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <Text className="text-white text-3xl font-black tracking-tight">
          {formatCurrency(invoice.amount)}
        </Text>
        {invoice.status === 'paid' ? (
          <Text className="text-success text-xs font-bold mt-1">
            Pago: {formatCurrency(invoice.paid_amount)}
          </Text>
        ) : (
          <Text className="text-textMutedDark text-xs font-semibold mt-1">
            Em aberto: {formatCurrency(remaining)}
          </Text>
        )}

        <View className="flex-row justify-between border-t border-white/10 mt-4 pt-3">
          <View>
            <Text className="text-textMutedDark text-[10px] font-bold uppercase tracking-wider">Fechamento</Text>
            <Text className="text-white text-xs font-bold mt-0.5">{formatDate(invoice.closing_date)}</Text>
          </View>
          <View>
            <Text className="text-textMutedDark text-[10px] font-bold uppercase tracking-wider">Vencimento</Text>
            <Text className="text-white text-xs font-bold mt-0.5">{formatDate(invoice.due_date)}</Text>
          </View>
          <View>
            <Text className="text-textMutedDark text-[10px] font-bold uppercase tracking-wider">Lançamentos</Text>
            <Text className="text-white text-xs font-bold mt-0.5">{lines.length}</Text>
          </View>
        </View>
      </View>

      {/* Lista de transações da fatura */}
      <Text className="text-textMutedDark text-xs font-bold uppercase tracking-wider mb-3">
        Detalhamento
      </Text>

      {lines.length === 0 ? (
        <View className="items-center py-12">
          <Receipt size={32} color={COLORS.textMutedDark} />
          <Text className="text-textMutedDark text-sm mt-3 font-semibold">
            Nenhum lançamento nesta fatura
          </Text>
        </View>
      ) : (
        <View className="pb-4">
          {lines.map((line) => {
            const cat = categories.find((c) => c.id === line.categoryId);
            return (
              <View
                key={line.key}
                className="flex-row items-center justify-between bg-surface-darkMuted border border-border-dark rounded-2xl p-3.5 mb-2"
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${cat?.color || COLORS.primary}20` }}
                  >
                    <Text style={{ color: cat?.color || COLORS.primary, fontSize: 14 }}>↓</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-white text-sm font-bold flex-shrink" numberOfLines={1}>
                        {line.description}
                      </Text>
                      {line.installmentLabel && (
                        <View className="ml-2 px-1.5 py-0.5 rounded-md bg-primary/15">
                          <Text className="text-primary text-[9px] font-extrabold">
                            {line.installmentLabel}
                          </Text>
                        </View>
                      )}
                      {line.isRecurrent && (
                        <View className="ml-2 flex-row items-center bg-primary/15 px-1.5 py-0.5 rounded-md">
                          <Repeat size={9} color={COLORS.primary} />
                        </View>
                      )}
                    </View>
                    <Text className="text-textMutedDark text-[11px] mt-0.5">
                      {cat?.name || 'Geral'} • {formatDate(line.date)}
                    </Text>
                  </View>
                </View>
                <Text className="text-white text-sm font-extrabold">
                  {formatCurrency(line.value)}
                </Text>
              </View>
            );
          })}

          {/* Total */}
          <View className="mt-3 pt-4 border-t border-border-dark flex-row justify-between items-center">
            <Text className="text-textMutedDark text-xs font-bold uppercase tracking-wider">
              Total da Fatura
            </Text>
            <Text className="text-white text-base font-black">
              {formatCurrency(invoice.amount)}
            </Text>
          </View>
        </View>
      )}
    </Modal>
  );
};
