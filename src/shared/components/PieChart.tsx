import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS } from '../../core/theme';

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: ChartDataItem[];
  size?: number;
  strokeWidth?: number;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 200,
  strokeWidth = 24,
}) => {
  const filteredData = data.filter(item => item.value > 0);
  const total = filteredData.reduce((acc, curr) => acc + curr.value, 0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let accumulatedAngle = 0;

  if (total === 0 || filteredData.length === 0) {
    return (
      <View className="items-center justify-center p-4">
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        </Svg>
        <Text className="text-foreground-muted text-sm mt-4 font-medium">Nenhum gasto registrado</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between py-2">
      {/* Círculo do Donut */}
      <View className="relative" style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {filteredData.map((item, index) => {
              const percentage = item.value / total;
              const strokeLength = percentage * circumference;
              const strokeOffset = circumference - strokeLength + accumulatedAngle;
              
              // Incrementa o offset acumulado com o comprimento da fatia atual (com sinal negativo devido à rotação/offset)
              accumulatedAngle -= strokeLength;

              return (
                <Circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  fill="transparent"
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>
        {/* Texto Central */}
        <View 
          className="absolute items-center justify-center" 
          style={{ 
            top: strokeWidth, 
            left: strokeWidth, 
            width: size - (strokeWidth * 2), 
            height: size - (strokeWidth * 2) 
          }}
        >
          <Text className="text-xs uppercase tracking-widest font-semibold text-foreground-muted">Total</Text>
          <Text className="text-foreground text-lg font-bold mt-0.5">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
          </Text>
        </View>
      </View>

      {/* Legendas */}
      <View className="flex-1 ml-6 gap-2">
        {filteredData.slice(0, 5).map((item, index) => (
          <View key={index} className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center flex-1 pr-2">
              <View 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: item.color }} 
              />
              <Text className="text-foreground text-xs font-semibold truncate" numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <Text className="text-foreground-muted text-xs font-bold">
              {Math.round((item.value / total) * 100)}%
            </Text>
          </View>
        ))}
        {filteredData.length > 5 && (
          <Text className="text-foreground-muted text-xs italic pl-5">
            + {filteredData.length - 5} categorias
          </Text>
        )}
      </View>
    </View>
  );
};
