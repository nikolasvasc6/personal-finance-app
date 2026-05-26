import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/shared/store/useAuthStore';
import { Navigation } from './src/core/navigation';

// Importação das diretivas globais do Tailwind CSS / NativeWind
import './global.css';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Inicializar autenticação e escuta de sessão do Supabase
    initializeAuth();
  }, [initializeAuth]);

  return (
    <SafeAreaProvider>
      {/* Barra de status clara para contrastar com o fundo escuro (Dark Mode) */}
      <StatusBar style="light" />
      <Navigation />
    </SafeAreaProvider>
  );
}
