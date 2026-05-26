import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Repeat } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { useFinanceStore, Transaction } from '../../shared/store/useFinanceStore';
import { COLORS } from '../../core/theme';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  value: z.string().min(1, 'O valor é obrigatório'),
  description: z.string().min(2, 'Insira uma descrição válida'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  paymentMethod: z.enum(['credit', 'debit', 'pix', 'cash']),
  accountId: z.string().optional(),
  creditCardId: z.string().optional(),
  transferTargetAccountId: z.string().optional(),
  installments: z.string().default('1'),
  date: z.string(),
  notes: z.string().optional(),
  recurrent: z.boolean().default(false),
}).refine(data => {
  if (data.type === 'transfer') {
    return !!data.accountId && !!data.transferTargetAccountId && data.accountId !== data.transferTargetAccountId;
  }
  if (data.paymentMethod === 'credit') {
    return !!data.creditCardId;
  }
  return !!data.accountId;
}, {
  message: "Preencha as contas/cartões corretamente.",
  path: ["accountId"]
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface QuickTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: 'income' | 'expense' | 'transfer';
  editingTransaction?: Transaction | null;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  visible,
  onClose,
  defaultType = 'expense',
  editingTransaction = null,
}) => {
  const { accounts, creditCards, categories, installments, addTransaction, deleteTransaction, addRecurrence } = useFinanceStore();
  const isEditing = !!editingTransaction;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: defaultType,
      value: '',
      description: '',
      categoryId: '',
      paymentMethod: defaultType === 'income' ? 'pix' : 'debit',
      accountId: '',
      creditCardId: '',
      transferTargetAccountId: '',
      installments: '1',
      date: new Date().toISOString(),
      notes: '',
      recurrent: false,
    },
  });

  const currentType = watch('type');
  const currentPaymentMethod = watch('paymentMethod');

  // Sincronizar campos quando o tipo ou o modal abre
  useEffect(() => {
    if (!visible) return;

    if (editingTransaction) {
      const instCount = installments.find(i => i.transaction_id === editingTransaction.id)?.total_installments ?? 1;
      reset({
        type: editingTransaction.type,
        value: editingTransaction.value.toString().replace('.', ','),
        description: editingTransaction.description,
        categoryId: editingTransaction.category_id ?? '',
        paymentMethod: editingTransaction.payment_method,
        accountId: editingTransaction.account_id ?? '',
        creditCardId: editingTransaction.credit_card_id ?? '',
        transferTargetAccountId: editingTransaction.transfer_target_account_id ?? '',
        installments: instCount.toString(),
        date: editingTransaction.date,
        notes: editingTransaction.notes ?? '',
        recurrent: false,
      });
    } else {
      reset({
        type: defaultType,
        value: '',
        description: '',
        categoryId: '',
        paymentMethod: defaultType === 'income' ? 'pix' : 'debit',
        accountId: accounts[0]?.id || '',
        creditCardId: creditCards[0]?.id || '',
        transferTargetAccountId: accounts[1]?.id || '',
        installments: '1',
        date: new Date().toISOString(),
        notes: '',
        recurrent: false,
      });
    }
  }, [visible, defaultType, accounts, creditCards, editingTransaction, installments]);

  // Filtrar categorias
  const filteredCategories = categories.filter(
    (c) => c.type === (currentType === 'transfer' ? 'expense' : currentType)
  );

  const onSubmit = async (data: TransactionFormData) => {
    try {
      const parsedValue = parseFloat(data.value.replace(',', '.'));
      if (isNaN(parsedValue) || parsedValue <= 0) {
        Alert.alert('Valor inválido', 'O valor deve ser maior que zero.');
        return;
      }

      // Preservar recurrence_id ao editar; criar nova recurrence se toggle on em create
      let recurrenceId: string | null = editingTransaction?.recurrence_id ?? null;
      const canBeRecurrent =
        !editingTransaction &&
        data.type !== 'transfer' &&
        data.recurrent;

      if (canBeRecurrent) {
        const isCreditRec = data.paymentMethod === 'credit';
        const newRecId = await addRecurrence({
          type: data.type as 'income' | 'expense',
          value: parsedValue,
          description: data.description,
          category_id: data.categoryId,
          account_id: isCreditRec ? null : (data.accountId || null),
          credit_card_id: isCreditRec ? (data.creditCardId || null) : null,
          frequency: 'monthly',
          start_date: data.date.split('T')[0],
          end_date: null,
          active: true,
        });
        if (!newRecId) {
          Alert.alert('Erro', 'Não foi possível criar a recorrência. Transação não salva.');
          return;
        }
        recurrenceId = newRecId;
      }

      if (editingTransaction) {
        await deleteTransaction(editingTransaction.id);
      }

      // Recorrência força parcelas = 1 (assinatura é cobrança única mensal)
      const installmentsCount =
        data.paymentMethod === 'credit' && !data.recurrent ? parseInt(data.installments) : 1;

      await addTransaction({
        type: data.type,
        value: parsedValue,
        description: data.description,
        category_id: data.categoryId,
        payment_method: data.type === 'transfer' ? 'debit' : data.paymentMethod,
        account_id: data.type === 'transfer' ? (data.accountId || null) : (data.paymentMethod === 'credit' ? null : (data.accountId || null)),
        credit_card_id: data.type === 'transfer' ? null : (data.paymentMethod === 'credit' ? (data.creditCardId || null) : null),
        transfer_target_account_id: data.type === 'transfer' ? (data.transferTargetAccountId || null) : null,
        date: data.date,
        notes: data.notes || null,
        tags: null,
        recurrence_id: recurrenceId,
      }, installmentsCount);

      onClose();
    } catch (error: any) {
      Alert.alert(
        isEditing ? 'Erro ao atualizar' : 'Erro ao salvar',
        error.message || 'Houve um erro ao processar a transação.'
      );
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={isEditing ? 'Editar Transação' : 'Nova Transação'}>
      <ScrollView className="space-y-4" keyboardShouldPersistTaps="handled">
        {/* Seletor de Tipo (Receita / Despesa / Transferência) */}
        <View className="flex-row bg-surface-darkMuted p-1.5 rounded-2xl mb-6">
          {(['expense', 'income', 'transfer'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`flex-1 py-3 rounded-xl items-center ${
                currentType === t 
                  ? (t === 'income' ? 'bg-success' : (t === 'expense' ? 'bg-danger' : 'bg-primary')) 
                  : 'bg-transparent'
              }`}
              onPress={() => {
                setValue('type', t);
                setValue('paymentMethod', t === 'income' ? 'pix' : 'debit');
              }}
            >
              <Text className="text-white font-bold capitalize">
                {t === 'expense' ? 'Despesa' : (t === 'income' ? 'Receita' : 'Transf.')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input de Valor */}
        <Controller
          control={control}
          name="value"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Valor (R$)"
              placeholder="0,00"
              keyboardType="decimal-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.value?.message}
            />
          )}
        />

        {/* Input de Descrição */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Descrição"
              placeholder="Ex: Almoço, Salário, Internet"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.description?.message}
            />
          )}
        />

        {/* Seletor de Categoria */}
        <View className="mb-5">
          <Text className="text-textMutedDark text-sm font-medium mb-2 pl-1">Categoria</Text>
          <View className="flex-row flex-wrap gap-2">
            {filteredCategories.map((c) => {
              const isSelected = watch('categoryId') === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  className={`px-4 py-2.5 rounded-full border ${
                    isSelected ? 'bg-primary border-primary' : 'bg-surface-dark border-border-dark'
                  }`}
                  onPress={() => setValue('categoryId', c.id)}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-textMutedDark'}`}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.categoryId && (
            <Text className="text-danger text-xs mt-1 pl-1">{errors.categoryId.message}</Text>
          )}
        </View>

        {/* Configurações de Meio de Pagamento */}
        {currentType !== 'transfer' && (
          <View className="mb-5">
            <Text className="text-textMutedDark text-sm font-medium mb-2 pl-1">Forma de Pagamento</Text>
            <View className="flex-row bg-surface-darkMuted p-1.5 rounded-2xl">
              {(currentType === 'expense' ? ['debit', 'credit', 'pix', 'cash'] : ['pix', 'debit', 'cash']).map((method) => {
                const isSelected = currentPaymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    className={`flex-1 py-2.5 rounded-xl items-center ${
                      isSelected ? 'bg-primary' : 'bg-transparent'
                    }`}
                    onPress={() => setValue('paymentMethod', method as any)}
                  >
                    <Text className="text-white text-xs font-bold capitalize">
                      {method === 'credit' ? 'Crédito' : (method === 'debit' ? 'Débito' : method.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* CONTA DE ORIGEM (se não for crédito e não for transferência simples sem conta) */}
        {currentType === 'transfer' || (currentType !== 'transfer' && currentPaymentMethod !== 'credit') ? (
          <View className="mb-5">
            <Text className="text-textMutedDark text-sm font-medium mb-2 pl-1">
              {currentType === 'transfer' ? 'Conta de Origem' : 'Conta/Carteira'}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {accounts.map((a) => {
                const isSelected = watch('accountId') === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    className={`px-4 py-3 rounded-2xl border flex-row items-center ${
                      isSelected ? 'bg-primary/20 border-primary' : 'bg-surface-dark border-border-dark'
                    }`}
                    style={{ minWidth: '45%' }}
                    onPress={() => setValue('accountId', a.id)}
                  >
                    <View className="w-3.5 h-3.5 rounded-full mr-2" style={{ backgroundColor: a.color }} />
                    <View>
                      <Text className="text-white text-xs font-bold">{a.name}</Text>
                      <Text className="text-textMutedDark text-[10px]">
                        Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(a.balance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* CONTA DE DESTINO (Apenas para Transferências) */}
        {currentType === 'transfer' && (
          <View className="mb-5">
            <Text className="text-textMutedDark text-sm font-medium mb-2 pl-1">Conta de Destino</Text>
            <View className="flex-row flex-wrap gap-2">
              {accounts.map((a) => {
                const isSelected = watch('transferTargetAccountId') === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    className={`px-4 py-3 rounded-2xl border flex-row items-center ${
                      isSelected ? 'bg-primary/20 border-primary' : 'bg-surface-dark border-border-dark'
                    }`}
                    style={{ minWidth: '45%' }}
                    onPress={() => setValue('transferTargetAccountId', a.id)}
                  >
                    <View className="w-3.5 h-3.5 rounded-full mr-2" style={{ backgroundColor: a.color }} />
                    <View>
                      <Text className="text-white text-xs font-bold">{a.name}</Text>
                      <Text className="text-textMutedDark text-[10px]">
                        Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(a.balance)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* CARTÃO DE CRÉDITO E PARCELAMENTO */}
        {currentType === 'expense' && currentPaymentMethod === 'credit' && (
          <View className="space-y-4">
            <View className="mb-2">
              <Text className="text-textMutedDark text-sm font-medium mb-2 pl-1">Selecione o Cartão</Text>
              <View className="flex-row flex-wrap gap-2">
                {creditCards.map((c) => {
                  const isSelected = watch('creditCardId') === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      className={`px-4 py-3 rounded-2xl border flex-row items-center ${
                        isSelected ? 'bg-primary/20 border-primary' : 'bg-surface-dark border-border-dark'
                      }`}
                      style={{ minWidth: '45%' }}
                      onPress={() => setValue('creditCardId', c.id)}
                    >
                      <View className="w-3.5 h-3.5 rounded-full mr-2" style={{ backgroundColor: c.color }} />
                      <View>
                        <Text className="text-white text-xs font-bold">{c.name}</Text>
                        <Text className="text-textMutedDark text-[10px]">
                          Lmt Disp: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.limit_available)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Esconder parcelas quando for recorrência — assinatura é sempre 1x mensal */}
            {!watch('recurrent') && (
              <Controller
                control={control}
                name="installments"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Número de Parcelas"
                    placeholder="1"
                    keyboardType="number-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.installments?.message}
                  />
                )}
              />
            )}
          </View>
        )}

        {/* Toggle Recorrência Mensal — só em criação. Disponível em todos os
            meios de pagamento exceto transferência (assinaturas: Netflix, Spotify, etc) */}
        {!isEditing && currentType !== 'transfer' && (
          <View className="flex-row items-center justify-between bg-surface-darkMuted p-4 rounded-2xl mb-5">
            <View className="flex-row items-center flex-1 pr-3">
              <Repeat size={20} color={COLORS.primary} />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-sm">Repetir todo mês</Text>
                <Text className="text-textMutedDark text-xs mt-0.5">
                  Lança automaticamente uma nova transação igual a cada mês.
                </Text>
              </View>
            </View>
            <Switch
              value={watch('recurrent')}
              onValueChange={(v) => setValue('recurrent', v)}
              trackColor={{ false: COLORS.borderDark, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        {/* Observações */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Observações (Opcional)"
              placeholder="Digite detalhes extras da transação"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.notes?.message}
            />
          )}
        />

        <Button
          label={isEditing ? 'Salvar Alterações' : 'Confirmar Transação'}
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          className="mt-6"
        />
      </ScrollView>
    </Modal>
  );
};
