import type { Profile } from '@/database/repositories/profile.repository';
import { profileRepo } from '@/database/repositories/profile.repository';
import type { User } from '@/types';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import React, {
  createContext, ReactNode, useCallback, useContext, useEffect, useState,
} from 'react';

interface AuthContextType {
  user: User | null;
  hasProfile: boolean | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-consulta la DB. Llamar después de guardar/editar un perfil. */
  refreshHasProfile: () => Promise<void>;
  /** Actualiza el snapshot del usuario en SecureStore (para modo edición). */
  updateUserProfile: (profile: Profile | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  hasProfile: null,
  isLoading: true,
  login: async () => { },
  logout: async () => { },
  refreshHasProfile: async () => { },
  updateUserProfile: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfileState] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadInitialState = useCallback(async () => {
    try {
      const has = await profileRepo.hasAny(db);
      setHasProfileState(has);

      const currentProfile = has ? await profileRepo.get(db) : null;

      const userData = await SecureStore.getItemAsync('user');
      if (userData) {
        const parsedUser = JSON.parse(userData) as User;
        if (parsedUser.expiresAt && Date.now() > parsedUser.expiresAt) {
          await SecureStore.deleteItemAsync('user');
          setUser(null);
        } else {
          setUser({ ...parsedUser, profile: currentProfile } as User);
        }
      }
    } catch (error) {
      console.error('[Auth] loadInitialState falló:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);


  const refreshHasProfile = async () => {
    const has = await profileRepo.hasAny(db);
    setHasProfileState(has);
  };

  const updateUserProfile = async (profile: Profile | null) => {
    if (!user) return;
    const updated = { ...user, profile } as User;
    await SecureStore.setItemAsync('user', JSON.stringify(updated));
    setUser(updated);
  };

  const login = async (userData: User) => {
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        hasProfile,
        isLoading,
        login,
        logout,
        refreshHasProfile,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}