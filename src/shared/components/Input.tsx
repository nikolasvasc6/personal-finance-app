import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { COLORS } from '../../core/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  className = '',
  ...props
}) => {
  return (
    <View className={`w-full mb-5 ${className}`}>
      {label && (
        <Text className="text-foreground-muted text-sm font-medium mb-2 pl-1">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center w-full bg-surface border rounded-2xl px-4 py-4 min-h-[58] ${
          error ? 'border-danger' : 'border-border focus:border-primary'
        }`}
      >
        {icon && <View className="mr-3">{icon}</View>}
        <TextInput
          className="flex-1 text-foreground text-base py-0"
          placeholderTextColor={COLORS.foregroundSubtle}
          {...props}
        />
        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>
      {error && (
        <Text className="text-danger text-xs mt-1 pl-1 font-medium">
          {error}
        </Text>
      )}
    </View>
  );
};
