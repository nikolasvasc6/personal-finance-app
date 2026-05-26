import React from 'react';
import { View, ViewProps, TouchableOpacity } from 'react-native';

interface CardProps extends ViewProps {
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onPress, ...props }) => {
  const containerClasses = `bg-surface-dark border border-border-dark rounded-3xl p-5 overflow-hidden ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity 
        activeOpacity={0.85}
        className={containerClasses}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={containerClasses} {...props}>
      {children}
    </View>
  );
};
