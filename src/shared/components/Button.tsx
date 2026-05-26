import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { COLORS } from '../../core/theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  let btnClasses = 'flex-row items-center justify-center py-4 px-6 rounded-2xl active:opacity-80 transition-all ';
  let txtClasses = 'font-semibold text-base ';

  if (variant === 'primary') {
    btnClasses += 'bg-primary';
    txtClasses += 'text-white';
  } else if (variant === 'secondary') {
    btnClasses += 'bg-surface-darkMuted';
    txtClasses += 'text-white';
  } else if (variant === 'outline') {
    btnClasses += 'border border-border-dark bg-transparent';
    txtClasses += 'text-white';
  } else if (variant === 'danger') {
    btnClasses += 'bg-danger';
    txtClasses += 'text-white';
  } else if (variant === 'ghost') {
    btnClasses += 'bg-transparent';
    txtClasses += 'text-primary';
  }

  if (disabled || loading) {
    btnClasses += ' opacity-50';
  }

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`${btnClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : '#FFFFFF'} />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={txtClasses}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
