import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { saveProfile } from '@/database/operations';
import { sendPersonaToApi } from '@/services/api'; // We'll use this or similar for registrant
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const GENERO_OPTIONS = ['Hombre', 'Mujer'] as const;

export default function RegisterScreen() {
    const db = useSQLiteContext();
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [form, setForm] = useState({
        cedula: '',
        nombres: '',
        apellidos: '',
        telefono: '',
        email: '',
        sexo: 'M',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditing = React.useRef(false);

    React.useEffect(() => {
        let mounted = true;
        const loadExistingProfile = async () => {
            // Esperamos un poco para evitar crash en la animación de entrada
            // y para que el usuario no vea el "parpadeo" de etiquetas
            await new Promise(resolve => setTimeout(resolve, 600));
            
            try {
                if (!db || !mounted) return;
                
                const tableCheck = await db.getAllAsync<{ name: string }>(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='profile'"
                );
                
                if (tableCheck.length > 0) {
                    const profile = await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
                    if (profile && mounted) {
                        isEditing.current = true;
                        setForm({
                            cedula: (profile as any).cedula,
                            nombres: (profile as any).nombres,
                            apellidos: (profile as any).apellidos,
                            telefono: (profile as any).telefono,
                            email: (profile as any).email || '',
                            sexo: (profile as any).sexo || 'M',
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                if (mounted) setInitialLoading(false);
            }
        };
        loadExistingProfile();
        return () => { mounted = false; };
    }, [db]);

    const updateField = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => {
            const n = { ...prev };
            delete n[field];
            return n;
        });
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.cedula.trim()) e.cedula = 'La cédula es requerida';
        if (!form.nombres.trim()) e.nombres = 'El nombre es requerido';
        if (!form.apellidos.trim()) e.apellidos = 'El apellido es requerido';
        if (!form.telefono.trim()) e.telefono = 'El teléfono es requerido';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);

        try {
            // Collect device info
            const deviceInfo = {
                brand: Device.brand || '',
                model: Device.modelName || '',
                os_version: Device.osVersion || '',
                device_id: Device.osBuildId || '', // Simplified ID
            };

            const fullProfile = { ...form, ...deviceInfo };

            // 1. Save locally
            await saveProfile(db, fullProfile);

            // 2. Sync to API (Fire and forget or wait?)
            // We should use a dedicated endpoint /api/v1/registrants
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/registrants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.EXPO_PUBLIC_API_KEY || '',
                },
                body: JSON.stringify(fullProfile),
            });

            if (!response.ok) {
                console.warn('[Register] API sync failed, will retry later');
            }

            // 3. Mark as logged in
            await login({
                id: 1, // Mock local ID
                username: form.cedula,
                cedula: form.cedula,
                nombre: `${form.nombres} ${form.apellidos}`
            });

            Alert.alert('¡Éxito!', isEditing.current ? 'Perfil actualizado.' : 'Perfil configurado correctamente.');
            
            if (isEditing.current) {
                router.back();
            } else {
                router.replace('/(tabs)/form');
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo completar el registro.');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Cargando información...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Ionicons name={isEditing.current ? "create" : "person-add"} size={40} color={Colors.primary} />
                    <Text style={styles.title}>{isEditing.current ? "Editar Perfil" : "Configurar Perfil"}</Text>
                    { !isEditing.current && <Text style={styles.subtitle}>Solo necesitamos esto la primera vez</Text> }
                </View>

                <View style={styles.card}>
                    <FormInput
                        label="Cédula *"
                        placeholder="Ej: 12345678"
                        value={form.cedula}
                        onChangeText={v => updateField('cedula', v)}
                        keyboardType="numeric"
                        error={errors.cedula}
                        icon={<Ionicons name="card-outline" size={20} color={Colors.textMuted} />}
                    />
                    <FormInput
                        label="Nombres *"
                        placeholder="Tus nombres"
                        value={form.nombres}
                        onChangeText={v => updateField('nombres', v)}
                        error={errors.nombres}
                        icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />}
                    />
                    <FormInput
                        label="Apellidos *"
                        placeholder="Tus apellidos"
                        value={form.apellidos}
                        onChangeText={v => updateField('apellidos', v)}
                        error={errors.apellidos}
                        icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />}
                    />
                    <FormInput
                        label="Teléfono *"
                        placeholder="0412..."
                        value={form.telefono}
                        onChangeText={v => updateField('telefono', v)}
                        keyboardType="phone-pad"
                        error={errors.telefono}
                        icon={<Ionicons name="call-outline" size={20} color={Colors.textMuted} />}
                    />
                    <FormInput
                        label="Correo (Opcional)"
                        placeholder="ejemplo@correo.com"
                        value={form.email}
                        onChangeText={v => updateField('email', v)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        icon={<Ionicons name="mail-outline" size={20} color={Colors.textMuted} />}
                    />

                    <View style={styles.genderSection}>
                        <Text style={styles.label}>Sexo</Text>
                        <View style={styles.genderRow}>
                            {GENERO_OPTIONS.map((opt) => {
                                const val = opt === 'Hombre' ? 'M' : 'F';
                                const selected = form.sexo === val;
                                return (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.genderBtn, selected && styles.genderBtnActive]}
                                        onPress={() => updateField('sexo', val)}
                                    >
                                        <Text style={[styles.genderText, selected && styles.genderTextActive]}>{opt}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <Button
                        title={isEditing.current ? "Guardar Cambios" : "Comenzar"}
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.btn}
                    />

                    {isEditing.current && (
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            style={styles.cancelLink}
                        >
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    loadingText: { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: FontSize.md },
    scroll: { padding: Spacing.xl, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: Spacing.xl },
    title: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginTop: Spacing.sm },
    subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 4 },
    card: {
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5
    },
    genderSection: { marginBottom: Spacing.lg },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
    genderRow: { flexDirection: 'row', gap: Spacing.md },
    genderBtn: {
        flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md,
        borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center'
    },
    genderBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    genderText: { fontWeight: '600', color: Colors.textSecondary },
    genderTextActive: { color: Colors.white },
    btn: { marginTop: Spacing.md },
    cancelLink: { marginTop: Spacing.md, alignItems: 'center', padding: Spacing.sm },
    cancelText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' }
});
