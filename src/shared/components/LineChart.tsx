import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { COLORS } from '../../core/theme';
import { formatCurrency } from '../../core/utils';

interface LineChartDataItem {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartDataItem[];
  width?: number;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 300,
  height = 140,
}) => {
  if (!data || data.length === 0) {
    return (
      <View className="items-center justify-center py-10">
        <Text className="text-textMutedDark text-sm">Sem dados históricos</Text>
      </View>
    );
  }

  // Encontrar valores min e max
  const values = data.map((item) => item.value);
  const maxValue = Math.max(...values, 100); // Evitar divisão por zero ou valor muito baixo
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue;

  // Margens de desenho interno do SVG
  const paddingX = 20;
  const paddingY = 20;
  const chartWidth = width - (paddingX * 2);
  const chartHeight = height - (paddingY * 2);

  // Calcular pontos (x, y)
  const points = data.map((item, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth;
    // O eixo Y no SVG começa no topo, então invertemos a escala
    const percentage = valueRange > 0 ? (item.value - minValue) / valueRange : 0.5;
    const y = paddingY + chartHeight - percentage * chartHeight;
    return { x, y, value: item.value, label: item.label };
  });

  // Gerar caminho da linha (Path)
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  // Gerar caminho do preenchimento de gradiente sob a linha (Area Path)
  let areaPath = '';
  if (points.length > 0) {
    const startX = points[0].x;
    const endX = points[points.length - 1].x;
    const bottomY = paddingY + chartHeight;
    areaPath = `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }

  return (
    <View className="items-center justify-center w-full">
      <Svg width={width} height={height}>
        <Defs>
          {/* Gradiente para a área preenchida */}
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Desenha área sob a linha com gradiente */}
        {areaPath !== '' && (
          <Path d={areaPath} fill="url(#chartGradient)" />
        )}

        {/* Desenha linha principal */}
        {linePath !== '' && (
          <Path
            d={linePath}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Pontos de destaque e valores nos extremos/último */}
        {points.map((point, index) => {
          // Mostrar apenas o ponto final ou pontas para não poluir
          const isLast = index === points.length - 1;
          const isFirst = index === 0;
          if (!isLast && !isFirst) return null;

          return (
            <React.Fragment key={index}>
              <Circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={COLORS.primary}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Rótulos do eixo X */}
      <View className="flex-row justify-between w-full px-5 mt-2">
        {data.map((item, index) => (
          <Text key={index} className="text-textMutedDark text-[10px] font-semibold uppercase">
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
};
