import { Button } from '@/components/Button';
import { DebugOverlay } from '@/components/DebugOverlay';
import { FormInput } from '@/components/FormInput';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { authenticateUser } from '@/database/operations';
import { loginToApi } from '@/services/api';
import { isOnline } from '@/services/network';
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

export default function LoginScreen() {
    const db = useSQLiteContext();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Debug state
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
            console.log(`[Login] Iniciando login para: ${username}`);
            let user = await authenticateUser(db, username.trim(), password.trim());
            let isFromApi = false;

            // Si no está local y hay internet, buscamos en la API
            if (!user) {
                console.log('[Login] No se encontró usuario local, verificando conexión...');
                const online = await isOnline();
                console.log(`[Login] Conexión detectada: ${online}`);
                if (online) {
                    console.log('[Login] Intentando login vía API...');
                    const apiResponse = await loginToApi(username.trim(), password.trim());
                    console.log(`[Login] Respuesta API recibida: ${apiResponse.success ? 'EXITO' : 'FALLO'}`);
                    if (apiResponse.success && apiResponse.data) {
                        const apiData = apiResponse.data;
                        user = {
                            id: apiData.id || 0,
                            username: apiData.username || username.trim(),
                            nombre: apiData.name || 'Usuario Online',
                            role: apiData.role || 1,
                            token: apiData.token,
                            expiresAt: apiData.expires_at ? new Date(apiData.expires_at).getTime() :
                                (Date.now() + 8 * 60 * 60 * 1000)
                        };
                        isFromApi = true;
                    }
                }
            }

            if (user) {
                console.log('[Login] Login final exitoso, guardando sesión...');
                await login(user);
                router.replace('/(tabs)/form');
            } else {
                console.log('[Login] No se pudo autenticar al usuario ni local ni remotamente');
                setError('Usuario o contraseña incorrectos');
            }
        } catch (err: any) {
            console.error('[Login] Error CRITICO:', err);
            setError(`Error al iniciar sesión: ${err.message || 'Error desconocido'}`);
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
                {/* Logo / Header */}
                <View style={styles.header}>
                    <Pressable onPress={handleLogoPress} style={styles.logoContainer}>
                        <Ionicons name="people-circle" size={80} color={Colors.white} />
                    </Pressable>
                    <Text style={styles.title}>ElimAPP</Text>
                    <View style={styles.goldLine} />
                    <Text style={styles.subtitle}>Iglesia de la Cruz</Text>
                </View>

                {/* Login Form */}
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

                    <Text style={styles.hint}>
                        {/* Usuario por defecto insertado en schema.ts */}
                        Usuario por defecto: admin / admin123
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>
                        v{Constants.expoConfig?.version || '*1.0.0'} (Build {Constants.expoConfig?.android?.versionCode || '*1'})
                    </Text>
                </View>

                <DebugOverlay
                    visible={debugVisible}
                    onClose={() => setDebugVisible(false)}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

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
