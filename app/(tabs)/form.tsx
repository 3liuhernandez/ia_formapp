import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { SyncBadge } from '@/components/SyncBadge';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { insertPersona } from '@/database/operations';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncPendingRecords } from '@/services/sync';
import type { PersonaInput } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

const GENERO_OPTIONS = ['Hombre', 'Mujer'] as const;

// Removed separate getDb helper to avoid bypassing initialization

const EMPTY_FORM: PersonaInput = {
    nombre: '', cedula: '', edad: '', telefono: '', telefono_opcional: '',
    email: '', direccion: '', punto_referencia: '', sector_barrio: '',
    fecha_nacimiento: '', genero: 'M',
};

export default function FormScreen() {
    const contextDb = useSQLiteContext();
    const { user } = useAuth();
    const isConnected = useNetworkStatus();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalIsOffline, setModalIsOffline] = useState(false);
    const [form, setForm] = useState<PersonaInput>({ ...EMPTY_FORM });

    const updateField = (field: keyof PersonaInput, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.nombre.trim()) e.nombre = 'El nombre es requerido';
        if (!form.cedula.trim()) e.cedula = 'La cédula es requerida';
        if (!form.telefono.trim()) e.telefono = 'El teléfono es requerido';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email no válido';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await insertPersona(contextDb, { ...form, registrant_id: user?.cedula || '' }, user?.id ?? 1);
            setForm({ ...EMPTY_FORM });
            if (isConnected) {
                setModalMessage('Registro guardado exitosamente'); setModalIsOffline(false);
                syncPendingRecords(contextDb).catch(console.error);
            } else {
                setModalMessage('Registro guardado localmente.\nSe sincronizará cuando haya internet.'); setModalIsOffline(true);
            }
            setShowModal(true);
        } catch (err: any) {
            Alert.alert('Error al guardar', `No se pudo guardar el registro localmente: ${err.message}`);
            console.error('[Form Submit Error]:', err);
        } finally { setLoading(false); }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Nuevo Registro</Text>
                        <View style={styles.goldLine} />
                    </View>
                    <SyncBadge isConnected={isConnected} />
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionLabel}>DATOS PERSONALES</Text>
                    <FormInput label="Nombre completo *" placeholder="Ej: Juan Pérez" value={form.nombre}
                        onChangeText={(v) => updateField('nombre', v)} error={errors.nombre}
                        icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />} />
                    <FormInput label="Cédula / Documento *" placeholder="Ej: 12345678" value={form.cedula}
                        onChangeText={(v) => updateField('cedula', v)} keyboardType="numeric" error={errors.cedula}
                        icon={<Ionicons name="card-outline" size={20} color={Colors.textMuted} />} />
                    <View style={styles.row}>
                        <FormInput label="Edad" placeholder="Ej: 30" value={form.edad}
                            onChangeText={(v) => updateField('edad', v)} keyboardType="numeric"
                            containerStyle={styles.halfInput}
                            icon={<Ionicons name="calendar-number-outline" size={20} color={Colors.textMuted} />} />
                        <View style={styles.halfInput}>
                            <Text style={styles.genderLabel}>Género</Text>
                            <View style={styles.genderRow}>
                                {GENERO_OPTIONS.map((option) => {
                                    const value = option === 'Hombre' ? 'M' : 'F';
                                    const isSelected = form.genero === value;
                                    return (
                                        <TouchableOpacity key={option} style={[styles.genderBtn, isSelected && styles.genderBtnActive]}
                                            onPress={() => updateField('genero', value)} activeOpacity={0.7}>
                                            <Ionicons name={option === 'Hombre' ? 'male' : 'female'} size={16} color={isSelected ? Colors.white : Colors.primary} />
                                            <Text style={[styles.genderText, isSelected && styles.genderTextActive]}>{option}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                    <FormInput label="Fecha de nacimiento" placeholder="DD/MM/AAAA" value={form.fecha_nacimiento}
                        onChangeText={(v) => updateField('fecha_nacimiento', v)} keyboardType="numeric"
                        icon={<Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />} />

                    <View style={styles.divider} />
                    <Text style={styles.sectionLabel}>CONTACTO</Text>
                    <FormInput label="Teléfono *" placeholder="Ej: 04121234567" value={form.telefono}
                        onChangeText={(v) => updateField('telefono', v)} keyboardType="phone-pad" error={errors.telefono}
                        icon={<Ionicons name="call-outline" size={20} color={Colors.textMuted} />} />
                    <FormInput label="Teléfono opcional" placeholder="Ej: 04241234567" value={form.telefono_opcional}
                        onChangeText={(v) => updateField('telefono_opcional', v)} keyboardType="phone-pad"
                        icon={<Ionicons name="call-outline" size={20} color={Colors.textMuted} />} />
                    <FormInput label="Email" placeholder="Ej: correo@ejemplo.com" value={form.email}
                        onChangeText={(v) => updateField('email', v)} keyboardType="email-address" autoCapitalize="none"
                        error={errors.email} icon={<Ionicons name="mail-outline" size={20} color={Colors.textMuted} />} />

                    <View style={styles.divider} />
                    <Text style={styles.sectionLabel}>UBICACIÓN</Text>
                    <FormInput label="Dirección" placeholder="Ej: Calle 10, Casa 5" value={form.direccion}
                        onChangeText={(v) => updateField('direccion', v)}
                        icon={<Ionicons name="location-outline" size={20} color={Colors.textMuted} />} />
                    <FormInput label="Punto de referencia" placeholder="Ej: Frente a la farmacia" value={form.punto_referencia}
                        onChangeText={(v) => updateField('punto_referencia', v)}
                        icon={<Ionicons name="navigate-outline" size={20} color={Colors.textMuted} />} />
                    <FormInput label="Sector / Barrio" placeholder="Ej: Barrio Central" value={form.sector_barrio}
                        onChangeText={(v) => updateField('sector_barrio', v)}
                        icon={<Ionicons name="map-outline" size={20} color={Colors.textMuted} />} />
                </View>

                <Button title="Guardar Registro" onPress={handleSubmit} loading={loading} style={styles.submitButton}
                    icon={<Ionicons name="save-outline" size={20} color={Colors.white} />} />
            </ScrollView>

            {/* Success Modal */}
            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIcon, modalIsOffline ? styles.modalIconOffline : styles.modalIconOnline]}>
                            <Ionicons name={modalIsOffline ? 'cloud-offline' : 'checkmark-circle'} size={48} color={Colors.white} />
                        </View>
                        <Text style={styles.modalTitle}>{modalIsOffline ? '¡Guardado Offline!' : '¡Registro Exitoso!'}</Text>
                        <Text style={styles.modalMessage}>{modalMessage}</Text>
                        <View style={styles.modalGoldLine} />
                        <Button title="Aceptar" onPress={() => setShowModal(false)} style={styles.modalButton} />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.xl },
    title: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: '800' },
    goldLine: { width: 40, height: 3, backgroundColor: Colors.gold, borderRadius: 2, marginTop: Spacing.xs },
    formCard: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.cardBorder, shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    sectionLabel: { color: Colors.wine, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.md, marginTop: Spacing.xs },
    row: { flexDirection: 'row', gap: Spacing.md },
    halfInput: { flex: 1 },
    divider: { height: 1, backgroundColor: Colors.gold, opacity: 0.3, marginVertical: Spacing.md },
    genderLabel: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs + 2, letterSpacing: 0.3 },
    genderRow: { flexDirection: 'row', gap: Spacing.sm },
    genderBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5,
        borderColor: Colors.primary, backgroundColor: Colors.white, minHeight: 50,
    },
    genderBtnActive: { backgroundColor: Colors.primary },
    genderText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
    genderTextActive: { color: Colors.white },
    submitButton: { marginTop: Spacing.lg },
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
    modalContent: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl,
        alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
    },
    modalIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
    modalIconOnline: { backgroundColor: Colors.success },
    modalIconOffline: { backgroundColor: Colors.warning },
    modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
    modalMessage: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },
    modalGoldLine: { width: 50, height: 3, backgroundColor: Colors.gold, borderRadius: 2, marginBottom: Spacing.lg },
    modalButton: { width: '100%' },
});
