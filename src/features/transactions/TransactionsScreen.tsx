import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Search, Trash2, HelpCircle, Repeat } from 'lucide-react-native';
import { useFinanceStore, Transaction } from '../../shared/store/useFinanceStore';
import { formatCurrency, formatDate } from '../../core/utils';
import { COLORS } from '../../core/theme';
import { Input } from '../../shared/components/Input';
import { Card } from '../../shared/components/Card';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { Modal } from '../../shared/components/Modal';
import { Button } from '../../shared/components/Button';
import { QuickTransactionModal } from './QuickTransactionModal';

export const TransactionsScreen: React.FC = () => {
  const { transactions, categories, deleteTransaction } = useFinanceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditModalVisible(true);
  };

  const closeEdit = () => {
    setEditModalVisible(false);
    setEditingTx(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTx) return;
    setDeleting(true);
    try {
      await deleteTransaction(confirmDeleteTx.id);
      setConfirmDeleteTx(null);
    } finally {
      setDeleting(false);
    }
  };

  // Filtragem local
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Filtro por tipo
    if (selectedType !== 'all' && tx.type !== selectedType) return false;

    // 2. Filtro por texto de busca
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const descMatch = tx.description.toLowerCase().includes(query);
      const notesMatch = tx.notes ? tx.notes.toLowerCase().includes(query) : false;
      const cat = categories.find((c) => c.id === tx.category_id);
      const catMatch = cat ? cat.name.toLowerCase().includes(query) : false;

      return descMatch || notesMatch || catMatch;
    }

    return true;
  });

  return (
    <ScreenBackground>
      <View className="flex-1 pt-14 px-5">
      <Text className="text-foreground text-2xl font-black mt-4 mb-4 tracking-tight">Minhas Transações</Text>

      {/* Barra de Busca */}
      <Input
        placeholder="Buscar por descrição, categoria..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        icon={<Search size={18} color={COLORS.foregroundMuted} />}
        className="mb-2"
      />

      {/* Filtros Rápidos de Tipo */}
      <View className="flex-row bg-white/70 border border-white/70 p-1 rounded-2xl mb-6">
        {(['all', 'expense', 'income', 'transfer'] as const).map((type) => {
          const isActive = selectedType === type;
          return (
            <TouchableOpacity
              key={type}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                isActive ? 'bg-primary' : 'bg-transparent'
              }`}
              onPress={() => setSelectedType(type)}
            >
              <Text className={`text-xs font-bold capitalize ${isActive ? 'text-white' : 'text-foreground-muted'}`}>
                {type === 'all' ? 'Todas' : (type === 'expense' ? 'Despesas' : (type === 'income' ? 'Receitas' : 'Transf.'))}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista de Transações */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pb-6">
        <View className="gap-3 pb-10">
          {filteredTransactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.category_id);
            const isExpense = tx.type === 'expense';
            return (
              <Card key={tx.id} variant="glass" className="flex-row items-center justify-between py-4 mb-2">
                {/* Área tocável que abre o modal de edição */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEdit(tx)}
                  className="flex-row items-center flex-1 pr-4"
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${cat?.color || COLORS.primary}15` }}
                  >
                    <Text style={{ color: cat?.color || COLORS.primary, fontSize: 16 }}>
                      {isExpense ? '↓' : (tx.type === 'transfer' ? '⇄' : '↑')}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-foreground font-bold text-sm truncate flex-shrink" numberOfLines={1}>
                        {tx.description}
                      </Text>
                      {tx.recurrence_id && (
                        <View className="ml-2 flex-row items-center bg-primary/15 px-1.5 py-0.5 rounded-md">
                          <Repeat size={9} color={COLORS.primary} />
                        </View>
                      )}
                    </View>
                    <Text className="text-foreground-muted text-xs mt-0.5">
                      {cat?.name || 'Geral'} • {formatDate(tx.date)}
                    </Text>
                    {tx.notes && (
                      <Text className="text-foreground-muted text-[10px] italic mt-0.5 truncate" numberOfLines={1}>
                        {tx.notes}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                <View className="items-end">
                  <Text className={`font-extrabold text-sm ${isExpense ? 'text-foreground' : 'text-success'}`}>
                    {isExpense ? '-' : '+'} {formatCurrency(tx.value)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setConfirmDeleteTx(tx)}
                    className="mt-2 p-1"
                    hitSlop={8}
                  >
                    <Trash2 size={14} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}

          {filteredTransactions.length === 0 && (
            <View className="items-center py-20">
              <HelpCircle size={36} color={COLORS.foregroundMuted} />
              <Text className="text-foreground-muted text-sm mt-3 font-semibold">Nenhuma transação encontrada</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Edição (reutiliza o QuickTransactionModal) */}
      <QuickTransactionModal
        visible={editModalVisible}
        onClose={closeEdit}
        editingTransaction={editingTx}
      />

      {/* Confirmação de Exclusão — funciona em web e mobile (Alert.alert do RN
          não dispara o callback dos botões em react-native-web) */}
      <Modal
        visible={!!confirmDeleteTx}
        onClose={() => !deleting && setConfirmDeleteTx(null)}
        title="Excluir Transação"
      >
        <View className="pb-4">
          <Text className="text-foreground text-base mb-2">
            Tem certeza que deseja excluir{' '}
            <Text className="font-bold">"{confirmDeleteTx?.description}"</Text>?
          </Text>
          <Text className="text-foreground-muted text-sm mb-8">
            O saldo da conta ou o limite do cartão será reajustado automaticamente.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => setConfirmDeleteTx(null)}
                disabled={deleting}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Excluir"
                variant="danger"
                onPress={handleConfirmDelete}
                loading={deleting}
              />
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </ScreenBackground>
  );
};
