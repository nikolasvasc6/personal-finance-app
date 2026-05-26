import { create } from 'zustand';
import { supabase } from '../../core/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  biometrics_enabled: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      // 1. Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      await get().setSession(session);

      // 2. Ouvir mudanças na autenticação
      supabase.auth.onAuthStateChange(async (_event, session) => {
        await get().setSession(session);
      });
    } catch (error) {
      console.error('Erro ao inicializar autenticação:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  setSession: async (session: Session | null) => {
    if (!session) {
      set({ session: null, user: null, profile: null, loading: false });
      return;
    }

    set({ session, user: session.user, loading: true });
    await get().fetchProfile(session.user.id);
    set({ loading: false });
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile: data as Profile });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const user = get().user;
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null,
      }));
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    } finally {
      set({ loading: false });
    }
  },
}));
