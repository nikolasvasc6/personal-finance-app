import React, { useState } from 'react';
import { View, Text, Switch, Alert, TouchableOpacity } from 'react-native';
import { LogOut, User, Shield, HelpCircle, Database, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../shared/store/useAuthStore';
import { useFinanceStore } from '../../shared/store/useFinanceStore';
import { supabase } from '../../core/supabase';
import { Card } from '../../shared/components/Card';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { COLORS } from '../../core/theme';

export const SettingsScreen: React.FC = () => {
  const { profile, signOut, updateProfile } = useAuthStore();
  const { fetchData } = useFinanceStore();
  const [biometrics, setBiometrics] = useState(profile?.biometrics_enabled || false);
  const [loadingMock, setLoadingMock] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleToggleBiometrics = async (value: boolean) => {
    setBiometrics(value);
    try {
      await updateProfile({ biometrics_enabled: value });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a configuração de biometria.');
      setBiometrics(!value);
    }
  };

  const handleSignOut = () => {
    setConfirmLogout(true);
  };

  // Confirma logout via Modal (Alert.alert com callback nao dispara em react-native-web)
  const handleConfirmLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmLogout(false);
    } finally {
      setSigningOut(false);
    }
  };

  // Carrega massa de testes mock para preencher gráficos e tabelas instantaneamente no MVP
  const handleLoadMockData = async () => {
    setLoadingMock(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Limpar dados anteriores do usuário
      await Promise.all([
        supabase.from('installments').delete().eq('invoice_id', 'id'), // Cascade já limpa, mas rodamos por segurança
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('invoices').delete().filter('credit_card_id', 'in', `(select id from credit_cards where user_id = '${user.id}')`),
        supabase.from('credit_cards').delete().eq('user_id', user.id),
        supabase.from('accounts').delete().eq('user_id', user.id),
      ]);

      // 2. Inserir Contas Mock
      const { data: acc1 } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: 'Conta Corrente',
        type: 'checking',
        balance: 2450.50,
        icon: 'Landmark',
        color: COLORS.primary
      }).select().single();

      const { data: acc2 } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: 'Dinheiro Físico',
        type: 'cash',
        balance: 150.00,
        icon: 'Wallet',
        color: COLORS.success
      }).select().single();

      // 3. Inserir Cartão Mock
      const { data: card } = await supabase.from('credit_cards').insert({
        user_id: user.id,
        name: 'Cartão Gold',
        brand: 'Mastercard',
        limit_total: 5000.00,
        limit_available: 4200.00,
        closing_day: 10,
        due_day: 17,
        color: COLORS.primary
      }).select().single();

      // 4. Buscar Categorias Padrão
      const { data: cats } = await supabase.from('categories').select('*');
      const catAlimentacao = cats?.find(c => c.name === 'Alimentação')?.id;
      const catTransporte = cats?.find(c => c.name === 'Transporte')?.id;
      const catSalario = cats?.find(c => c.name === 'Salário')?.id;
      const catLazer = cats?.find(c => c.name === 'Lazer')?.id;

      // 5. Inserir Fatura e Transações Mock no Cartão de Crédito (Parceladas e à vista)
      // Fatura de Maio/2026
      const { data: inv } = await supabase.from('invoices').insert({
        credit_card_id: card.id,
        period: '2026-05',
        status: 'open',
        due_date: '2026-05-17',
        closing_date: '2026-05-10',
        amount: 800.00
      }).select().single();

      // Compra à vista no cartão de crédito
      const { data: txCredit } = await supabase.from('transactions').insert({
        user_id: user.id,
        credit_card_id: card.id,
        invoice_id: inv.id,
        type: 'expense',
        payment_method: 'credit',
        value: 200.00,
        description: 'Jantar no Outback',
        category_id: catAlimentacao,
        date: '2026-05-02T20:00:00.000Z'
      }).select().single();

      // Compra parcelada (3 parcelas de 200.00 cada = total 600.00)
      const { data: txInstallment } = await supabase.from('transactions').insert({
        user_id: user.id,
        credit_card_id: card.id,
        type: 'expense',
        payment_method: 'credit',
        value: 600.00,
        description: 'Tênis de Corrida Nike',
        category_id: catLazer,
        date: '2026-05-04T15:00:00.000Z',
        notes: 'Compra parcelada em 3x'
      }).select().single();

      // Gerar as 3 parcelas
      // Parcela 1 cai na Fatura de Maio
      await supabase.from('installments').insert({
        transaction_id: txInstallment.id,
        installment_number: 1,
        total_installments: 3,
        value: 200.00,
        invoice_id: inv.id,
        due_date: '2026-05-17',
        status: 'unpaid'
      });

      // Parcela 2 e 3 caem nas Faturas de Junho e Julho (criando-as automaticamente)
      const { data: invJun } = await supabase.from('invoices').insert({
        credit_card_id: card.id,
        period: '2026-06',
        status: 'open',
        due_date: '2026-06-17',
        closing_date: '2026-06-10',
        amount: 200.00
      }).select().single();

      await supabase.from('installments').insert({
        transaction_id: txInstallment.id,
        installment_number: 2,
        total_installments: 3,
        value: 200.00,
        invoice_id: invJun.id,
        due_date: '2026-06-17',
        status: 'unpaid'
      });

      const { data: invJul } = await supabase.from('invoices').insert({
        credit_card_id: card.id,
        period: '2026-07',
        status: 'open',
        due_date: '2026-07-17',
        closing_date: '2026-07-10',
        amount: 200.00
      }).select().single();

      await supabase.from('installments').insert({
        transaction_id: txInstallment.id,
        installment_number: 3,
        total_installments: 3,
        value: 200.00,
        invoice_id: invJul.id,
        due_date: '2026-07-17',
        status: 'unpaid'
      });

      // 6. Inserir Transações de Receita e Despesa na Conta Corrente
      // Receita (Salário)
      await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: acc1.id,
        type: 'income',
        payment_method: 'pix',
        value: 4500.00,
        description: 'Salário Google Inc.',
        category_id: catSalario,
        date: '2026-05-05T09:00:00.000Z'
      });

      // Despesa (Combustível)
      await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: acc1.id,
        type: 'expense',
        payment_method: 'debit',
        value: 120.00,
        description: 'Abastecimento Posto BR',
        category_id: catTransporte,
        date: '2026-05-06T12:00:00.000Z'
      });

      // Atualizar dados na store
      await fetchData();
      Alert.alert('Sucesso', 'Massa de testes carregada com sucesso! Gráficos e limites atualizados.');
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao popular banco.');
    } finally {
      setLoadingMock(false);
    }
  };

  return (
    <ScreenBackground>
      <View className="flex-1 pt-14 px-5">
      <Text className="text-foreground text-2xl font-black mt-4 mb-6 tracking-tight">Ajustes</Text>

      {/* Cartão de Perfil — destaque em gradiente azul */}
      <Card variant="gradient" className="flex-row items-center mb-6">
        <View className="w-14 h-14 bg-white/25 border border-white/30 rounded-full items-center justify-center mr-4">
          <User size={28} color="#FFFFFF" />
        </View>
        <View>
          <Text className="text-white text-lg font-bold">{profile?.full_name || 'Usuário'}</Text>
          <Text className="text-white/80 text-sm mt-0.5">{profile?.email || 'email@exemplo.com'}</Text>
        </View>
      </Card>

      {/* Lista de Opções */}
      <View className="gap-4">
        {/* Opção Biometria */}
        <Card variant="glass" className="flex-row items-center justify-between py-4 mb-3">
          <View className="flex-row items-center flex-1 pr-3">
            <Shield size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
            <Text className="text-foreground text-base font-semibold">Autenticação Biométrica</Text>
          </View>
          <Switch
            value={biometrics}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </Card>

        {/* Opção Popular Banco (Massa de Testes) */}
        <Card variant="glass" className="flex-row items-center justify-between py-4 mb-3" onPress={handleLoadMockData}>
          <View className="flex-row items-center flex-1 pr-3">
            <Database size={20} color={COLORS.success} style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-foreground text-base font-semibold">Massa de Testes (Mock)</Text>
              <Text className="text-foreground-muted text-xs mt-0.5">Preencher banco com dados fictícios</Text>
            </View>
          </View>
          <ChevronRight size={18} color={COLORS.foregroundMuted} />
        </Card>

        {/* Botão Sair da Conta */}
        <Button
          label="Sair da minha conta"
          variant="outline"
          icon={<LogOut size={20} color={COLORS.danger} />}
          onPress={handleSignOut}
          className="mt-6 border-danger/40 py-4"
        />
      </View>

      {/* Confirmação de Logout — Modal porque Alert.alert nao dispara callbacks em react-native-web */}
      <Modal
        visible={confirmLogout}
        onClose={() => !signingOut && setConfirmLogout(false)}
        title="Sair da Conta"
      >
        <View className="pb-4">
          <Text className="text-foreground text-base mb-2">
            Deseja realmente sair da sua conta?
          </Text>
          <Text className="text-foreground-muted text-sm mb-8">
            Você precisará entrar novamente para acessar suas finanças.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => setConfirmLogout(false)}
                disabled={signingOut}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Sair"
                variant="danger"
                onPress={handleConfirmLogout}
                loading={signingOut}
              />
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </ScreenBackground>
  );
};
