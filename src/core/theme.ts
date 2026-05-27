// Configurações do Design System para o App Financeiro (identidade visual estilo kie.ai — light/azul)
import {
  Utensils, Car, Smile, ShoppingCart, Heart, BookOpen,
  DollarSign, TrendingUp, PlusCircle, Box, CreditCard,
  Wallet, Landmark, Briefcase, HelpCircle, Activity,
  ShoppingBag, Flame, Coffee, Gift, Home, Shield, Wrench,
  Zap, Award, Bell
} from 'lucide-react-native';

export const COLORS = {
  // Brand
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF6FF',

  // Estados
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#E11D48',
  dangerSoft: '#FFE4E6',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  info: '#0EA5E9',
  infoSoft: '#E0F2FE',

  // Neutros (Light)
  background: '#FFFFFF',
  backgroundMuted: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Texto
  foreground: '#020817',
  foregroundMuted: '#64748B',
  foregroundSubtle: '#94A3B8',
  foregroundDisabled: '#CBD5E1',

  // Inverso (texto sobre primary/danger)
  onPrimary: '#FFFFFF',
};

// Cores pré-definidas para o usuário escolher ao criar Contas/Cartões
export const COLOR_OPTIONS = [
  { id: 'blue', name: 'Azul', value: '#2563EB' },
  { id: 'green', name: 'Verde', value: '#059669' },
  { id: 'amber', name: 'Âmbar', value: '#F59E0B' },
  { id: 'red', name: 'Vermelho', value: '#E11D48' },
  { id: 'pink', name: 'Rosa', value: '#EC4899' },
  { id: 'purple', name: 'Roxo', value: '#8B5CF6' },
  { id: 'cyan', name: 'Ciano', value: '#06B6D4' },
  { id: 'slate', name: 'Grafite', value: '#475569' },
  { id: 'teal', name: 'Teal', value: '#0D9488' },
  { id: 'gold', name: 'Dourado', value: '#CA8A04' },
];

// Ícones mapeados para usar de forma dinâmica
export const ICON_MAP = {
  Utensils,
  Car,
  Smile,
  ShoppingCart,
  Heart,
  BookOpen,
  DollarSign,
  TrendingUp,
  PlusCircle,
  Box,
  CreditCard,
  Wallet,
  Landmark,
  Briefcase,
  HelpCircle,
  Activity,
  ShoppingBag,
  Flame,
  Coffee,
  Gift,
  Home,
  Shield,
  Wrench,
  Zap,
  Award,
  Bell,
};

export type IconType = keyof typeof ICON_MAP;

export const ICON_OPTIONS: { id: IconType; name: string }[] = [
  { id: 'DollarSign', name: 'Dinheiro/Salário' },
  { id: 'CreditCard', name: 'Cartão de Crédito' },
  { id: 'Wallet', name: 'Carteira' },
  { id: 'Landmark', name: 'Banco/Investimento' },
  { id: 'Utensils', name: 'Alimentação' },
  { id: 'Car', name: 'Transporte/Carro' },
  { id: 'Smile', name: 'Lazer/Viagem' },
  { id: 'ShoppingCart', name: 'Mercado/Compras' },
  { id: 'Heart', name: 'Saúde' },
  { id: 'BookOpen', name: 'Educação' },
  { id: 'Home', name: 'Moradia/Casa' },
  { id: 'Briefcase', name: 'Trabalho/Negócios' },
  { id: 'Coffee', name: 'Cafeteria/Bares' },
  { id: 'Gift', name: 'Presente/Doação' },
  { id: 'TrendingUp', name: 'Rendimento' },
  { id: 'Zap', name: 'Utilidades/Contas' },
];
