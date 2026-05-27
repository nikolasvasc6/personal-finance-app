import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenBackgroundProps extends ViewProps {
  variant?: 'soft' | 'hero';
}

// Fundo de tela com gradiente azul-celeste contínuo (estilo kie.ai).
//
// Estratégia: camadas de LinearGradient sobrepostas com ângulos diferentes,
// sem formas circulares. Resulta em uma luz difusa azulada que escorre do
// topo para o branco, sem "blobs" previsíveis.
//
// `soft`  → telas internas (Dashboard, Contas, Transações, Ajustes).
// `hero`  → telas de destaque (Auth/Onboarding), com saturação ligeiramente maior.
export const ScreenBackground: React.FC<ScreenBackgroundProps> = ({
  children,
  style,
  variant = 'soft',
  ...props
}) => {
  const isHero = variant === 'hero';

  return (
    <View style={[styles.container, style]} {...props}>
      {/* Base vertical: azul-claro -> branco */}
      <LinearGradient
        colors={isHero
          ? ['#D6E4FF', '#E7EEFF', '#F4F7FF', '#FFFFFF']
          : ['#E4ECFB', '#EEF3FD', '#F7F9FE', '#FFFFFF']}
        locations={[0, 0.28, 0.6, 1]}
        style={styles.baseGradient}
      />

      {/* Brilho diagonal do canto superior direito (luz difusa azul) */}
      <LinearGradient
        colors={isHero
          ? ['rgba(96,148,255,0.40)', 'rgba(96,148,255,0.10)', 'rgba(255,255,255,0)']
          : ['rgba(116,162,255,0.28)', 'rgba(116,162,255,0.06)', 'rgba(255,255,255,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.9 }}
        style={styles.diagonalGlow}
        pointerEvents="none"
      />

      {/* Brilho lateral esquerdo discreto (camada de profundidade) */}
      <LinearGradient
        colors={isHero
          ? ['rgba(150,185,255,0.28)', 'rgba(150,185,255,0)']
          : ['rgba(170,196,255,0.18)', 'rgba(170,196,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
        style={styles.sideGlow}
        pointerEvents="none"
      />

      {/* Conteúdo */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  baseGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  diagonalGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '70%',
  },
  sideGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '70%',
    height: '55%',
  },
  content: {
    flex: 1,
  },
});
