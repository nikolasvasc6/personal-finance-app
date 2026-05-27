import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, CreditCard as CardIcon, Landmark, Trash2, CheckSquare } from 'lucide-react-native';
import { useFinanceStore, Account, CreditCard, Invoice } from '../../shared/store/useFinanceStore';
import { formatCurrency, formatDate } from '../../core/utils';
import { COLOR_OPTIONS, ICON_OPTIONS, COLORS } from '../../core/theme';
import { Card } from '../../shared/components/Card';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { InvoiceDetailModal } from './InvoiceDetailModal';

// Schemas Zod
const accountSchema = z.object({
  name: z.string().min(2, 'Nome da conta muito curto'),
  type: z.enum(['checking', 'savings', 'cash', 'investment', 'other']),
  balance: z.string().min(1, 'Saldo inicial é obrigatório'),
  color: z.string().min(1, 'Selecione uma cor'),
  icon: z.string().min(1, 'Selecione um ícone'),
});

const cardSchema = z.object({
  name: z.string().min(2, 'Nome do cartão muito curto'),
  brand: z.string().min(1, 'Selecione a bandeira'),
  limitTotal: z.string().min(1, 'Limite total é obrigatório'),
  closingDay: z.string().refine(val => parseInt(val) >= 1 && parseInt(val) <= 31, 'Dia de fechamento inválido'),
  dueDay: z.string().refine(val => parseInt(val) >= 1 && parseInt(val) <= 31, 'Dia de vencimento inválido'),
  color: z.string().min(1, 'Selecione uma cor'),
});

type AccountFormData = z.infer<typeof accountSchema>;
type CardFormData = z.infer<typeof cardSchema>;

export const AccountsScreen: React.FC = () => {
  const { 
    accounts, 
    creditCards, 
    invoices, 
    addAccount, 
    deleteAccount, 
    addCreditCard, 
    deleteCreditCard,
    payInvoice 
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'accounts' | 'cards'>('accounts');
  
  // Modais de Criação
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  
  // Modal de Pagamento de Fatura
  const [payInvoiceModalVisible, setPayInvoiceModalVisible] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Confirmação de exclusão (Modal próprio — Alert.alert não dispara callbacks no react-native-web)
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<Account | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<CreditCard | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);

  // Resumo de fatura
  const [invoiceDetail, setInvoiceDetail] = useState<{ invoice: Invoice; card: CreditCard } | null>(null);

  const openInvoiceDetail = (invoice: Invoice, card: CreditCard) => {
    setInvoiceDetail({ invoice, card });
  };

  // Forms
  const { 
    control: accountControl, 
    handleSubmit: handleAccountSubmit, 
    setValue: setAccountValue,
    reset: resetAccount,
    formState: { errors: accountErrors } 
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '', type: 'checking', balance: '0', color: COLOR_OPTIONS[0].value, icon: ICON_OPTIONS[0].id }
  });

  const { 
    control: cardControl, 
    handleSubmit: handleCardSubmit, 
    setValue: setCardValue,
    reset: resetCard,
    formState: { errors: cardErrors } 
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: { name: '', brand: 'Mastercard', limitTotal: '', closingDay: '10', dueDay: '17', color: COLOR_OPTIONS[1].value }
  });

  const onCreateAccount = async (data: AccountFormData) => {
    try {
      const parsedBalance = parseFloat(data.balance.replace(',', '.'));
      await addAccount({
        name: data.name,
        type: data.type,
        balance: isNaN(parsedBalance) ? 0 : parsedBalance,
        icon: data.icon,
        color: data.color
      });
      Alert.alert('Sucesso', 'Conta cadastrada com sucesso!');
      setAccountModalVisible(false);
      resetAccount();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao criar conta.');
    }
  };

  const onCreateCard = async (data: CardFormData) => {
    try {
      const parsedLimit = parseFloat(data.limitTotal.replace(',', '.'));
      await addCreditCard({
        name: data.name,
        brand: data.brand,
        limit_total: isNaN(parsedLimit) ? 0 : parsedLimit,
        closing_day: parseInt(data.closingDay),
        due_day: parseInt(data.dueDay),
        color: data.color
      });
      Alert.alert('Sucesso', 'Cartão cadastrado com sucesso!');
      setCardModalVisible(false);
      resetCard();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao criar cartão.');
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!confirmDeleteAccount) return;
    setDeletingAccount(true);
    try {
      await deleteAccount(confirmDeleteAccount.id);
      setConfirmDeleteAccount(null);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível excluir a conta.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleConfirmDeleteCard = async () => {
    if (!confirmDeleteCard) return;
    setDeletingCard(true);
    try {
      await deleteCreditCard(confirmDeleteCard.id);
      setConfirmDeleteCard(null);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível excluir o cartão.');
    } finally {
      setDeletingCard(false);
    }
  };

  const handlePayInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setPayInvoiceModalVisible(true);
  };

  const handleConfirmPayment = async (accountId: string) => {
    if (!selectedInvoiceId) return;
    try {
      await payInvoice(selectedInvoiceId, accountId);
      Alert.alert('Sucesso', 'Fatura marcada como paga!');
      setPayInvoiceModalVisible(false);
      setSelectedInvoiceId(null);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível efetuar o pagamento.');
    }
  };

  return (
    <ScreenBackground>
      <View className="flex-1 pt-14 px-5">
      {/* Top Tabs */}
      <View className="flex-row justify-between items-center mb-6 mt-4">
        <View className="flex-row bg-white/70 border border-white/70 p-1 rounded-2xl flex-1 mr-4">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'accounts' ? 'bg-primary' : 'bg-transparent'}`}
            onPress={() => setActiveTab('accounts')}
          >
            <Text className={`font-bold text-xs ${activeTab === 'accounts' ? 'text-white' : 'text-foreground-muted'}`}>Minhas Contas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'cards' ? 'bg-primary' : 'bg-transparent'}`}
            onPress={() => setActiveTab('cards')}
          >
            <Text className={`font-bold text-xs ${activeTab === 'cards' ? 'text-white' : 'text-foreground-muted'}`}>Cartões de Crédito</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => activeTab === 'accounts' ? setAccountModalVisible(true) : setCardModalVisible(true)}
          className="bg-primary p-3.5 rounded-full"
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {activeTab === 'accounts' ? (
          // LISTAGEM DE CONTAS
          <View className="space-y-4 pb-10">
            {accounts.map((acc) => (
              <Card key={acc.id} variant="glass" className="relative flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 pr-6">
                  <View 
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                    style={{ backgroundColor: `${acc.color}15` }}
                  >
                    <Landmark size={24} color={acc.color} />
                  </View>
                  <View>
                    <Text className="text-foreground font-bold text-base">{acc.name}</Text>
                    <Text className="text-foreground-muted text-xs capitalize mt-0.5">{acc.type === 'checking' ? 'Conta Corrente' : acc.type}</Text>
                  </View>
                </View>
                
                <View className="items-end">
                  <Text className="text-foreground font-black text-base">{formatCurrency(acc.balance)}</Text>
                  <TouchableOpacity
                    onPress={() => setConfirmDeleteAccount(acc)}
                    className="mt-2"
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
            {accounts.length === 0 && (
              <View className="items-center py-16">
                <Text className="text-foreground-muted text-sm">Nenhuma conta cadastrada.</Text>
              </View>
            )}
          </View>
        ) : (
          // LISTAGEM DE CARTÕES DE CRÉDITO
          <View className="space-y-6 pb-10">
            {creditCards.map((card) => {
              // Buscar faturas deste cartão
              const cardInvoices = invoices.filter(i => i.credit_card_id === card.id);
              const openInvoice = cardInvoices.find(i => i.status === 'open');

              return (
                <Card key={card.id} className="p-0 border-0 bg-transparent mb-4">
                  {/* Cartão de Crédito Físico Simulado */}
                  <View 
                    className="p-6 rounded-[28px] relative overflow-hidden mb-4"
                    style={{ backgroundColor: card.color, height: 160 }}
                  >
                    <View className="flex-row justify-between items-start">
                      <View>
                        <Text className="text-white/70 text-xs font-semibold uppercase tracking-widest">Cartão de Crédito</Text>
                        <Text className="text-white text-xl font-bold mt-1">{card.name}</Text>
                      </View>
                      <Text className="text-white text-base font-extrabold italic">{card.brand}</Text>
                    </View>

                    <View className="absolute bottom-6 left-6 right-6 flex-row justify-between items-end">
                      <View>
                        <Text className="text-white/70 text-[10px] font-semibold uppercase">Limite Disponível</Text>
                        <Text className="text-white text-base font-extrabold">{formatCurrency(card.limit_available)}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white/70 text-[10px] font-semibold uppercase">Total</Text>
                        <Text className="text-white text-sm font-bold">{formatCurrency(card.limit_total)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Faturas Relacionadas */}
                  <View className="bg-white/85 border border-white/70 p-5 rounded-3xl space-y-4">
                    <View className="flex-row items-center justify-between pb-3 border-b border-border">
                      <Text className="text-foreground font-bold text-sm">Fatura Atual</Text>
                      <Text className="text-foreground-muted text-xs">Vence dia {card.due_day}</Text>
                    </View>

                    {openInvoice ? (
                      <View className="flex-row justify-between items-center">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => openInvoiceDetail(openInvoice, card)}
                          className="flex-1 pr-3"
                        >
                          <Text className="text-foreground text-xl font-black">{formatCurrency(openInvoice.amount)}</Text>
                          <Text className="text-foreground-muted text-xs mt-1">Fechamento: {formatDate(openInvoice.closing_date)}</Text>
                          <Text className="text-primary text-[10px] font-bold mt-1 uppercase tracking-wider">Ver resumo</Text>
                        </TouchableOpacity>
                        <Button
                          label="Pagar Fatura"
                          variant="ghost"
                          onPress={() => handlePayInvoiceClick(openInvoice.id)}
                          className="py-2.5 px-4"
                        />
                      </View>
                    ) : (
                      <Text className="text-foreground-muted text-sm">Sem faturas abertas.</Text>
                    )}

                    {/* Próximas Faturas/Histórico */}
                    {cardInvoices.filter(i => i.status !== 'open').length > 0 && (
                      <View className="pt-2">
                        <Text className="text-foreground-muted text-xs font-bold uppercase tracking-wider mb-2">Outras Faturas</Text>
                        {cardInvoices.filter(i => i.status !== 'open').map(inv => (
                          <TouchableOpacity
                            key={inv.id}
                            activeOpacity={0.7}
                            onPress={() => openInvoiceDetail(inv, card)}
                            className="flex-row justify-between items-center py-2 border-t border-border/50"
                          >
                            <Text className="text-foreground text-xs font-semibold">Período {inv.period}</Text>
                            <Text className={`text-xs font-bold ${inv.status === 'paid' ? 'text-success' : 'text-danger'}`}>
                              {inv.status === 'paid' ? 'PAGO' : 'FECHADA'} ({formatCurrency(inv.amount)})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => setConfirmDeleteCard(card)}
                      className="flex-row items-center justify-center pt-3 border-t border-border"
                    >
                      <Trash2 size={16} color={COLORS.danger} className="mr-2" />
                      <Text className="text-danger text-xs font-bold">Excluir Cartão</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
            {creditCards.length === 0 && (
              <View className="items-center py-16">
                <Text className="text-foreground-muted text-sm">Nenhum cartão cadastrado.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL CRIAR CONTA */}
      <Modal visible={accountModalVisible} onClose={() => setAccountModalVisible(false)} title="Nova Conta">
        <ScrollView className="space-y-4" keyboardShouldPersistTaps="handled">
          <Controller
            control={accountControl}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome da Conta"
                placeholder="Ex: Nubank, Carteira"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={accountErrors.name?.message}
              />
            )}
          />

          <View className="mb-4">
            <Text className="text-foreground-muted text-sm font-medium mb-2">Tipo de Conta</Text>
            <View className="flex-row flex-wrap gap-2">
              {(['checking', 'savings', 'cash', 'investment', 'other'] as const).map((t) => {
                const isActive = t === 'checking';
                return (
                  <TouchableOpacity
                    key={t}
                    className={`px-4 py-2.5 rounded-full border ${
                      isActive ? 'bg-primary border-primary' : 'bg-surface border-border'
                    }`}
                    onPress={() => setAccountValue('type', t)}
                  >
                    <Text className={`text-xs font-bold capitalize ${isActive ? 'text-white' : 'text-foreground'}`}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Controller
            control={accountControl}
            name="balance"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Saldo Inicial (R$)"
                placeholder="0,00"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={accountErrors.balance?.message}
              />
            )}
          />

          <View className="mb-4">
            <Text className="text-foreground-muted text-sm font-medium mb-2">Cor da Conta</Text>
            <View className="flex-row flex-wrap gap-3">
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  className="w-8 h-8 rounded-full border border-border"
                  style={{ backgroundColor: c.value }}
                  onPress={() => setAccountValue('color', c.value)}
                />
              ))}
            </View>
          </View>

          <Button
            label="Salvar Conta"
            variant="primary"
            onPress={handleAccountSubmit(onCreateAccount)}
            className="mt-4"
          />
        </ScrollView>
      </Modal>

      {/* MODAL CRIAR CARTÃO */}
      <Modal visible={cardModalVisible} onClose={() => setCardModalVisible(false)} title="Novo Cartão">
        <ScrollView className="space-y-4" keyboardShouldPersistTaps="handled">
          <Controller
            control={cardControl}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome do Cartão"
                placeholder="Ex: Nubank Roxinho"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={cardErrors.name?.message}
              />
            )}
          />

          <Controller
            control={cardControl}
            name="limitTotal"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Limite Total (R$)"
                placeholder="0,00"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={cardErrors.limitTotal?.message}
              />
            )}
          />

          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Controller
                control={cardControl}
                name="closingDay"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Dia Fechamento"
                    placeholder="10"
                    keyboardType="number-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={cardErrors.closingDay?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={cardControl}
                name="dueDay"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Dia Vencimento"
                    placeholder="17"
                    keyboardType="number-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={cardErrors.dueDay?.message}
                  />
                )}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-foreground-muted text-sm font-medium mb-2">Cor do Cartão</Text>
            <View className="flex-row flex-wrap gap-3">
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  className="w-8 h-8 rounded-full border border-border"
                  style={{ backgroundColor: c.value }}
                  onPress={() => setCardValue('color', c.value)}
                />
              ))}
            </View>
          </View>

          <Button
            label="Salvar Cartão"
            variant="primary"
            onPress={handleCardSubmit(onCreateCard)}
            className="mt-4"
          />
        </ScrollView>
      </Modal>

      {/* MODAL PAGAR FATURA (SELECIONAR CONTA) */}
      <Modal visible={payInvoiceModalVisible} onClose={() => setPayInvoiceModalVisible(false)} title="Pagar Fatura">
        <Text className="text-foreground-muted text-sm mb-4">Escolha a conta corrente para debitar o valor da fatura:</Text>
        <View className="space-y-3">
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              className="bg-surface border border-border p-4 rounded-2xl flex-row items-center justify-between"
              onPress={() => handleConfirmPayment(acc.id)}
            >
              <View className="flex-row items-center">
                <View className="w-3.5 h-3.5 rounded-full mr-3" style={{ backgroundColor: acc.color }} />
                <Text className="text-foreground font-bold text-sm">{acc.name}</Text>
              </View>
              <Text className="text-foreground-muted text-xs font-semibold">{formatCurrency(acc.balance)}</Text>
            </TouchableOpacity>
          ))}
          {accounts.length === 0 && (
            <Text className="text-danger text-sm font-medium text-center my-4">Você precisa cadastrar uma conta corrente primeiro.</Text>
          )}
        </View>
      </Modal>

      {/* Confirmação de Exclusão de Conta — funciona em web e mobile (Alert.alert do RN
          não dispara o callback dos botões em react-native-web) */}
      <Modal
        visible={!!confirmDeleteAccount}
        onClose={() => !deletingAccount && setConfirmDeleteAccount(null)}
        title="Excluir Conta"
      >
        <View className="pb-4">
          <Text className="text-foreground text-base mb-2">
            Tem certeza que deseja excluir{' '}
            <Text className="font-bold">"{confirmDeleteAccount?.name}"</Text>?
          </Text>
          <Text className="text-foreground-muted text-sm mb-8">
            Todos os lançamentos vinculados a esta conta serão afetados.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => setConfirmDeleteAccount(null)}
                disabled={deletingAccount}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Excluir"
                variant="danger"
                onPress={handleConfirmDeleteAccount}
                loading={deletingAccount}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Resumo de Fatura */}
      <InvoiceDetailModal
        visible={!!invoiceDetail}
        onClose={() => setInvoiceDetail(null)}
        invoice={invoiceDetail?.invoice ?? null}
        card={invoiceDetail?.card ?? null}
      />

      {/* Confirmação de Exclusão de Cartão */}
      <Modal
        visible={!!confirmDeleteCard}
        onClose={() => !deletingCard && setConfirmDeleteCard(null)}
        title="Excluir Cartão"
      >
        <View className="pb-4">
          <Text className="text-foreground text-base mb-2">
            Tem certeza que deseja excluir o cartão{' '}
            <Text className="font-bold">"{confirmDeleteCard?.name}"</Text>?
          </Text>
          <Text className="text-foreground-muted text-sm mb-8">
            Faturas e lançamentos vinculados a este cartão serão removidos.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => setConfirmDeleteCard(null)}
                disabled={deletingCard}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Excluir"
                variant="danger"
                onPress={handleConfirmDeleteCard}
                loading={deletingCard}
              />
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </ScreenBackground>
  );
};
