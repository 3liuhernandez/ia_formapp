import type { User } from '@/types';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
    user: User | null;
    hasProfile: boolean | null;
    isLoading: boolean;
    login: (user: User) => Promise<void>;
    logout: () => Promise<void>;
    setHasProfile: (has: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    hasProfile: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    setHasProfile: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const db = useSQLiteContext();
    const [user, setUser] = useState<User | null>(null);
    const [hasProfile, setHasProfileState] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadInitialState();
    }, [db]);

    const loadInitialState = async () => {
        try {
            // 1. Verificamos perfil
            let profileExists = false;
            try {
                if (db) {
                    const rs = await db.getFirstAsync('SELECT id FROM profile LIMIT 1');
                    profileExists = !!rs;
                }
            } catch (e) {
                // Table might not exist on first run
                profileExists = false;
            }
            setHasProfileState(profileExists);

            // 2. Cargamos usuario
            const userData = await SecureStore.getItemAsync('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                
                // Verificar si tiene tiempo de expiración (sesiones API)
                if (parsedUser.expiresAt && Date.now() > parsedUser.expiresAt) {
                    console.log('[Auth] Sesión expirada');
                    await SecureStore.deleteItemAsync('user');
                    setUser(null);
                } else {
                    setUser(parsedUser);
                }
            }
        } catch (error) {
            console.error('Error loading initial auth state:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (userData: User) => {
        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('user');
        setUser(null);
    };

    const setHasProfile = (has: boolean) => {
        setHasProfileState(has);
    };

    return (
        <AuthContext.Provider value={{ user, hasProfile, isLoading, login, logout, setHasProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
