import React from 'react';
import { Modal as RNModal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/60"
      >
        {/* Clique fora para fechar opcional */}
        <TouchableOpacity 
          activeOpacity={1} 
          className="flex-1" 
          onPress={onClose}
        />
        
        {/* Conteúdo do Modal (Bottom Sheet Style) */}
        <View className="bg-surface-dark border-t border-x border-border-dark rounded-t-[32px] max-h-[85%] min-h-[40%] pb-8 pt-6">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pb-4 border-b border-border-dark">
            <Text className="text-white text-xl font-bold">{title}</Text>
            <TouchableOpacity 
              onPress={onClose}
              className="bg-surface-darkMuted p-2 rounded-full"
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView 
            className="px-6 pt-5" 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};
