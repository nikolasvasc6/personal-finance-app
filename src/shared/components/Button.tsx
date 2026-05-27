import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../core/theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  icon?: React.ReactNode;
}

const shadowStyle: ViewStyle = {
  shadowColor: COLORS.primary,
  shadowOpacity: 0.25,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
};

const dangerShadowStyle: ViewStyle = {
  shadowColor: COLORS.danger,
  shadowOpacity: 0.2,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  // Primary: gradiente azul diagonal (estilo kie.ai)
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        disabled={isDisabled}
        activeOpacity={0.85}
        className={`rounded-2xl overflow-hidden ${isDisabled ? 'opacity-50' : ''} ${className}`}
        style={[!isDisabled ? shadowStyle : undefined, style]}
        {...props}
      >
        <LinearGradient
          colors={['#3B82F6', '#2563EB', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            paddingHorizontal: 24,
          }}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.onPrimary} />
          ) : (
            <View className="flex-row items-center justify-center">
              {icon && <View className="mr-2">{icon}</View>}
              <Text className="font-semibold text-base text-white tracking-tight">{label}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Variantes não-primárias mantêm o estilo plano original
  let btnClasses = 'flex-row items-center justify-center py-4 px-6 rounded-2xl active:opacity-80 ';
  let txtClasses = 'font-semibold text-base ';

  if (variant === 'secondary') {
    btnClasses += 'bg-surface-muted';
    txtClasses += 'text-foreground';
  } else if (variant === 'outline') {
    btnClasses += 'border border-border bg-transparent';
    txtClasses += 'text-foreground';
  } else if (variant === 'danger') {
    btnClasses += 'bg-danger';
    txtClasses += 'text-white';
  } else if (variant === 'ghost') {
    btnClasses += 'bg-transparent';
    txtClasses += 'text-primary';
  }

  if (isDisabled) {
    btnClasses += ' opacity-50';
  }

  return (
    <TouchableOpacity
      disabled={isDisabled}
      activeOpacity={0.85}
      className={`${btnClasses} ${className}`}
      style={[variant === 'danger' && !isDisabled ? dangerShadowStyle : undefined, style]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' || variant === 'secondary' ? COLORS.primary : COLORS.onPrimary} />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={txtClasses}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
