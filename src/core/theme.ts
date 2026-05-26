// Configurações do Design System para o App Financeiro (estilo Nubank/Notion/Linear)
import { 
  Utensils, Car, Smile, ShoppingCart, Heart, BookOpen, 
  DollarSign, TrendingUp, PlusCircle, Box, CreditCard, 
  Wallet, Landmark, Briefcase, HelpCircle, Activity, 
  ShoppingBag, Flame, Coffee, Gift, Home, Shield, Wrench,
  Zap, Award, Bell
} from 'lucide-react-native';

export const COLORS = {
  // Cores principais
  primary: '#820AD1', // Roxo Nubank
  primaryLight: '#A33DF2',
  primaryDark: '#5F089E',
  success: '#00B050',
  danger: '#F23A4A',
  warning: '#FF9500',
  info: '#007AFF',
  
  // Temas Dark/Light
  bgLight: '#F8F9FA',
  bgDark: '#0A0A0C',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#121215',
  surfaceDarkMuted: '#1E1E24',
  
  // Bordas e Muted
  borderLight: '#E2E8F0',
  borderDark: '#1F222A',
  textMutedLight: '#64748B',
  textMutedDark: '#8E9AA8',
};

// Cores pré-definidas para o usuário escolher ao criar Contas/Cartões
export const COLOR_OPTIONS = [
  { id: 'purple', name: 'Roxo Nubank', value: '#820AD1' },
  { id: 'blue', name: 'Azul Inter', value: '#007AFF' },
  { id: 'green', name: 'Verde Sucesso', value: '#00B050' },
  { id: 'orange', name: 'Laranja Itaú', value: '#FF9500' },
  { id: 'red', name: 'Vermelho Rubi', value: '#F23A4A' },
  { id: 'pink', name: 'Rosa Coral', value: '#FF2D55' },
  { id: 'indigo', name: 'Índigo Noturno', value: '#5856D6' },
  { id: 'gray', name: 'Cinza Grafite', value: '#3A3A3C' },
  { id: 'teal', name: 'Menta', value: '#30B0C7' },
  { id: 'gold', name: 'Ouro Nobre', value: '#D4AF37' },
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
