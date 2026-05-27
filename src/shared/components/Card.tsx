import React from 'react';
import { View, ViewProps, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CardProps extends ViewProps {
  onPress?: () => void;
  // `gradient` aplica um fundo azul-celeste diagonal e sombra azul (destaque).
  // `glass` mantém o card branco mas com leve glow azul (cards padrão sobre fundo gradiente).
  variant?: 'default' | 'gradient' | 'glass';
}

const baseShadow: ViewStyle = {
  shadowColor: '#0F1E3D',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

const gradientShadow: ViewStyle = {
  shadowColor: '#1D4ED8',
  shadowOpacity: 0.25,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onPress,
  style,
  variant = 'default',
  ...props
}) => {
  // Variante gradient → LinearGradient azul como container
  if (variant === 'gradient') {
    const inner = (
      <LinearGradient
        colors={['#3B82F6', '#2563EB', '#1E40AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientInner}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          className={`rounded-3xl overflow-hidden ${className}`}
          style={[gradientShadow, style]}
        >
          {inner}
        </TouchableOpacity>
      );
    }

    return (
      <View className={`rounded-3xl overflow-hidden ${className}`} style={[gradientShadow, style]} {...props}>
        {inner}
      </View>
    );
  }

  // Variantes default/glass — fundo branco com borda sutil
  const isGlass = variant === 'glass';
  const containerClasses = `${isGlass ? 'bg-white/85 border border-white/70' : 'bg-surface border border-border'} rounded-3xl p-5 overflow-hidden ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        className={containerClasses}
        style={[baseShadow, style]}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={containerClasses} style={[baseShadow, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  gradientInner: {
    padding: 20,
    borderRadius: 24,
  },
});
