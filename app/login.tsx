import { Button } from '@/components/Button';
import { DebugOverlay } from '@/components/DebugOverlay';
import { FormInput } from '@/components/FormInput';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { profileRepo } from '@/database/repositories/profile.repository';
import { userRepo, type User as UserRow } from '@/database/repositories/user.repository';
import { loginToApi } from '@/services/api';
import { isOnline } from '@/services/network';
import type { User } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── Helpers de conversión (un solo lugar, reusables) ──────────
function rowToSessionUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role_id: row.role_id,
    role_name: row.role_name,
    token: row.token ?? undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
  };
}

function apiToSessionUser(api: any, fallbackUsername: string): User {
  const roleName: 'register' | 'admin' = api.role === 'admin' ? 'admin' : 'register';
  return {
    id: api.id || 0,
    username: api.username || fallbackUsername,
    name: api.name || 'Usuario Online',
    role_id: api.role_id ?? (roleName === 'admin' ? 2 : 1), // Default to 'register' role
    role_name: roleName,
    token: api.token,
    expiresAt: api.expires_at
      ? new Date(api.expires_at).getTime()
      : Date.now() + 8 * 60 * 60 * 1000,
  };
}

export default function LoginScreen() {
  const db = useSQLiteContext();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [debugVisible, setDebugVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const handleLogoPress = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 5) {
      setDebugVisible(true);
      setTapCount(0);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let sessionUser: User | null = null;

      // 1. Local
      const dbUser = await userRepo.login(db, username.trim(), password.trim());
      if (dbUser) {
        sessionUser = rowToSessionUser(dbUser);
        console.log('[Login] Autenticado localmente');
      }

      // 2. API fallback
      if (!sessionUser && (await isOnline())) {
        console.log('[Login] Probando API...');
        const apiResponse = await loginToApi(username.trim(), password.trim());
        if (apiResponse.success && apiResponse.data) {
          sessionUser = apiToSessionUser(apiResponse.data, username.trim());
          console.log('[Login] Autenticado vía API');
        }
      }

      if (!sessionUser) {
        setError('Usuario o contraseña incorrectos');
        return;
      }

      // 3. Adjuntar perfil local
      const profile = await profileRepo.get(db);
      if (profile) sessionUser.profile = profile;

      // 4. Guardar sesión
      await login(sessionUser);
      router.replace('/(tabs)/form');
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(
        `Error al iniciar sesión: ${err instanceof Error ? err.message : 'Error desconocido'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={handleLogoPress} style={styles.logoContainer}>
            <Ionicons name="people-circle" size={80} color={Colors.white} />
          </Pressable>
          <Text style={styles.title}>ElimAPP</Text>
          <View style={styles.goldLine} />
          <Text style={styles.subtitle}>Iglesia de la Cruz</Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <FormInput
            label="Usuario"
            placeholder="Ingresa tu usuario"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />}
          />

          <FormInput
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
          />

          <Button
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
            icon={<Ionicons name="log-in-outline" size={20} color={Colors.white} />}
          />

          <Text style={styles.hint}>Usuario por defecto: admin / admin123</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>
            v{Constants.expoConfig?.version || '1.0.0'} (Build{' '}
            {Constants.expoConfig?.android?.versionCode || '1'})
          </Text>
        </View>

        <DebugOverlay visible={debugVisible} onClose={() => setDebugVisible(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ... styles sin cambios

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        borderWidth: 2,
        borderColor: Colors.gold,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        color: Colors.primary,
        fontSize: FontSize.title,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    goldLine: {
        width: 60,
        height: 3,
        backgroundColor: Colors.gold,
        borderRadius: 2,
        marginVertical: Spacing.sm,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
    },
    formContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: 'rgba(231, 76, 60, 0.08)',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSize.sm,
        flex: 1,
    },
    loginButton: {
        marginTop: Spacing.sm,
    },
    hint: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
    footer: {
        marginTop: Spacing.xl,
        paddingBottom: Spacing.lg,
        alignItems: 'center',
    },
    versionText: {
        color: Colors.textMuted,
        fontSize: 10,
        opacity: 0.6,
    },
});
