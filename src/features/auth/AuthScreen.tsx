import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, TrendingUp, Shield, CreditCard, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../core/supabase';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { ScreenBackground } from '../../shared/components/ScreenBackground';
import { COLORS } from '../../core/theme';

// Schemas de Validação com Zod
const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(3, 'Insira o seu nome completo'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'onboarding' | 'login' | 'register'>('onboarding');
  const [loading, setLoading] = useState(false);

  // Forms
  const { 
    control: loginControl, 
    handleSubmit: handleLoginSubmit, 
    formState: { errors: loginErrors },
    reset: resetLogin
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const { 
    control: registerControl, 
    handleSubmit: handleRegisterSubmit, 
    formState: { errors: registerErrors },
    reset: resetRegister
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' }
  });

  // Funções de Ação
  const onLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Erro no Login', error.message || 'Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          }
        }
      });
      if (error) throw error;
      Alert.alert('Sucesso!', 'Conta criada com sucesso. Faça login agora.');
      setMode('login');
      resetLogin({ email: data.email, password: '' });
      resetRegister();
    } catch (error: any) {
      Alert.alert('Erro no Cadastro', error.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizador do Onboarding
  if (mode === 'onboarding') {
    return (
      <ScreenBackground variant="hero">
        <View className="flex-1 px-6 justify-between py-14">
          {/* Topo / Logo */}
          <View className="items-center mt-12">
            <View className="bg-white/70 p-4 rounded-3xl mb-4 border border-primary/20">
              <TrendingUp size={48} color={COLORS.primary} />
            </View>
            <Text className="text-foreground text-3xl font-extrabold tracking-tight">antigravity</Text>
            <Text className="text-foreground-muted text-base mt-2">Sua inteligência financeira</Text>
          </View>

          {/* Features Carrossel visual */}
          <View className="gap-6 my-8">
            <View className="flex-row items-center bg-white/80 border border-white/70 p-4 rounded-2xl">
              <View className="bg-success/10 p-3 rounded-xl mr-4">
                <Shield size={24} color={COLORS.success} />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-bold text-base">Controle Absoluto</Text>
                <Text className="text-foreground-muted text-sm mt-0.5">Monitore saldo de contas e transações em tempo real.</Text>
              </View>
            </View>

            <View className="flex-row items-center bg-white/80 border border-white/70 p-4 rounded-2xl">
              <View className="bg-primary/10 p-3 rounded-xl mr-4">
                <CreditCard size={24} color={COLORS.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-bold text-base">Cartão de Crédito Avançado</Text>
                <Text className="text-foreground-muted text-sm mt-0.5">Controle compras parceladas, limites e faturas futuras.</Text>
              </View>
            </View>
          </View>

          {/* Botões de Ação */}
          <View className="gap-4">
            <Button
              label="Criar minha conta"
              variant="primary"
              onPress={() => setMode('register')}
              icon={<ChevronRight size={20} color="#FFFFFF" />}
            />
            <Button
              label="Já tenho conta (Entrar)"
              variant="outline"
              onPress={() => setMode('login')}
            />
          </View>
        </View>
      </ScreenBackground>
    );
  }

  // Renderizador do Login / Cadastro
  return (
    <ScreenBackground variant="hero">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6 py-10"
          style={{ backgroundColor: 'transparent' }}
          keyboardShouldPersistTaps="handled"
        >
        <View className="mb-8">
          <TouchableOpacity 
            onPress={() => setMode('onboarding')}
            className="self-start mb-6"
          >
            <Text className="text-primary text-base font-semibold">← Voltar</Text>
          </TouchableOpacity>
          <Text className="text-foreground text-3xl font-extrabold">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </Text>
          <Text className="text-foreground-muted text-base mt-2">
            {mode === 'login' 
              ? 'Entre com suas credenciais para continuar.' 
              : 'Preencha os campos para começar a economizar.'}
          </Text>
        </View>

        {mode === 'login' ? (
          // FORMULÁRIO DE LOGIN
          <View>
            <Controller
              control={loginControl}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Seu e-mail"
                  placeholder="exemplo@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={loginErrors.email?.message}
                  icon={<Mail size={20} color={COLORS.foregroundMuted} />}
                />
              )}
            />

            <Controller
              control={loginControl}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Sua senha"
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={loginErrors.password?.message}
                  icon={<Lock size={20} color={COLORS.foregroundMuted} />}
                />
              )}
            />

            <Button
              label="Entrar"
              variant="primary"
              loading={loading}
              onPress={handleLoginSubmit(onLogin)}
              className="mt-4"
            />
            
            <TouchableOpacity 
              onPress={() => setMode('register')} 
              className="mt-6 align-center items-center"
            >
              <Text className="text-foreground-muted text-sm">
                Não tem uma conta? <Text className="text-primary font-bold">Cadastre-se</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // FORMULÁRIO DE CADASTRO
          <View>
            <Controller
              control={registerControl}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nome completo"
                  placeholder="Nome Completo"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={registerErrors.fullName?.message}
                  icon={<User size={20} color={COLORS.foregroundMuted} />}
                />
              )}
            />

            <Controller
              control={registerControl}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Seu e-mail"
                  placeholder="exemplo@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={registerErrors.email?.message}
                  icon={<Mail size={20} color={COLORS.foregroundMuted} />}
                />
              )}
            />

            <Controller
              control={registerControl}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Sua senha"
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={registerErrors.password?.message}
                  icon={<Lock size={20} color={COLORS.foregroundMuted} />}
                />
              )}
            />

            <Button
              label="Registrar e Começar"
              variant="primary"
              loading={loading}
              onPress={handleRegisterSubmit(onRegister)}
              className="mt-4"
            />

            <TouchableOpacity 
              onPress={() => setMode('login')} 
              className="mt-6 align-center items-center"
            >
              <Text className="text-foreground-muted text-sm">
                Já tem uma conta? <Text className="text-primary font-bold">Faça Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
};
