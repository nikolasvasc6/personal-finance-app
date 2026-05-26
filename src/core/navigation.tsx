import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Landmark, History, Settings } from 'lucide-react-native';

import { useAuthStore } from '../shared/store/useAuthStore';
import { AuthScreen } from '../features/auth/AuthScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { AccountsScreen } from '../features/accounts/AccountsScreen';
import { TransactionsScreen } from '../features/transactions/TransactionsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { COLORS } from './theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navegação das Abas Principais (Usuário Autenticado)
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMutedDark,
        tabBarStyle: {
          backgroundColor: COLORS.surfaceDark,
          borderTopColor: COLORS.borderDark,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 12,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Dashboard') {
            return <Home size={size} color={color} />;
          } else if (route.name === 'Contas') {
            return <Landmark size={size} color={color} />;
          } else if (route.name === 'Transações') {
            return <History size={size} color={color} />;
          } else if (route.name === 'Ajustes') {
            return <Settings size={size} color={color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Contas" component={AccountsScreen} />
      <Tab.Screen name="Transações" component={TransactionsScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Navegador Geral
export const Navigation: React.FC = () => {
  const { session, loading } = useAuthStore();

  if (loading) {
    return null; // Pode exibir uma tela de Splash/Loading personalizada se desejado
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="App" component={AppTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
