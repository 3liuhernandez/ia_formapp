import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { SyncBadge } from '@/components/SyncBadge';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { NewPerson } from '@/database/repositories/people.repository';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePeople } from '@/hooks/usePeople';
import { syncPendingRecords } from '@/services/sync';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

const GENDER_OPTIONS = ['Hombre', 'Mujer'] as const;

const EMPTY_FORM: NewPerson = {
  dni: '',
  name: '',
  last_name: '',
  phone: '',
  phone_optional: '',
  email: '',
  address: '',
  parish: '',
  address_reference: '',
  gender: 'M',
  birthday_date: '',
  comments: '',
  visit_day: '',
  visit_time: '',
  registrant_dni: null,
};

export default function FormScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const isConnected = useNetworkStatus();
  const { add } = usePeople();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalIsOffline, setModalIsOffline] = useState(false);
  const [form, setForm] = useState<NewPerson>({ ...EMPTY_FORM });

  const fillRandomData = () => {
    const names = ['Juan', 'Pedro', 'Maria', 'Jose', 'Ana', 'Luis', 'Sofia', 'Carlos', 'Diego', 'Lucia'];
    const lastNames = ['Perez', 'Garcia', 'Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Hernandez', 'Diaz', 'Torres', 'Ramirez'];
    const locations = ['Calle Principal', 'Av. Bolivar', 'Barrio Obrero', 'Sector El Centro', 'Urbanización Nueva'];
    const domains = ['gmail.com', 'outlook.com', 'yahoo.com'];
    const comments = ['Solicita información adicional', 'Prefiere contacto por WhatsApp', 'Ha participado antes', 'Requiere seguimiento especial'];
    const parishes = ['Parroquia San Juan', 'Parroquia Santa Maria', 'Parroquia El Carmen', 'Parroquia La Paz'];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomDni = String(Math.floor(Math.random() * 20000000 + 10000000));
    const randomPhone = '0414' + Math.floor(Math.random() * 9000000 + 1000000);
    const randomEmail = `${randomName.toLowerCase()}.${randomLastName.toLowerCase()}${Math.floor(Math.random() * 99)}@${domains[Math.floor(Math.random() * domains.length)]}`;
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    const randomComment = comments[Math.floor(Math.random() * comments.length)];
    const randomVisitDay = new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Random date within the next 30 days
    const randomVisitTime = `${String(Math.floor(Math.random() * 8 + 9)).padStart(2, '0')}:00`; // Random time between 09:00 and 16:00
    const randomParish = parishes[Math.floor(Math.random() * parishes.length)];

    setForm({
      ...EMPTY_FORM,
      dni: randomDni,
      name: randomName,
      last_name: randomLastName,
      phone: randomPhone,
      email: randomEmail,
      address: randomLocation,
      address_reference: 'Punto de prueba',
      parish: randomParish,
      birthday_date: '1990-01-01',
      gender: Math.random() > 0.5 ? 'M' : 'F',
      visit_day: randomVisitDay,
      visit_time: randomVisitTime,
      comments: randomComment,
    });
    setErrors({});
  };

  const updateField = (field: keyof NewPerson, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'El nombre es requerido';
    if (!form.last_name.trim()) e.last_name = 'El apellido es requerido';
    if (!form.dni.trim()) e.dni = 'La cédula es requerida';
    if (!form.phone.trim()) e.phone = 'El teléfono es requerido';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Email no válido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: NewPerson = {
        ...form,
        registrant_dni: user?.profile?.dni ?? null,
      };
      await add(payload);

      setForm({ ...EMPTY_FORM });

      if (isConnected) {
        setModalMessage('Registro guardado exitosamente');
        setModalIsOffline(false);
        syncPendingRecords(db).catch(console.error);
      } else {
        setModalMessage('Registro guardado localmente.\nSe sincronizará cuando haya internet.');
        setModalIsOffline(true);
      }
      setShowModal(true);
    } catch (err) {
      Alert.alert(
        'Error al guardar',
        `No se pudo guardar el registro: ${err instanceof Error ? err.message : 'desconocido'}`
      );
      console.error('[Form Submit Error]:', err);
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Nuevo Registro</Text>
            <View style={styles.goldLine} />
            <TouchableOpacity onPress={fillRandomData} style={styles.debugFillBtn}>
              <Ionicons name="flask-outline" size={14} color={Colors.primary} />
              <Text style={styles.debugFillText}>Datos random</Text>
            </TouchableOpacity>
          </View>
          <SyncBadge isConnected={isConnected} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>DATOS PERSONALES</Text>
          <FormInput
            label="Nombres *"
            placeholder="Ej: Juan"
            value={form.name}
            onChangeText={(v) => updateField('name', v)}
            error={errors.name}
            icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Apellidos *"
            placeholder="Ej: Pérez"
            value={form.last_name}
            onChangeText={(v) => updateField('last_name', v)}
            error={errors.last_name}
            icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Cédula / Documento *"
            placeholder="Ej: 12345678"
            value={form.dni}
            onChangeText={(v) => updateField('dni', v)}
            keyboardType="numeric"
            error={errors.dni}
            icon={<Ionicons name="card-outline" size={20} color={Colors.textMuted} />}
          />
          <View style={styles.row}>
            <FormInput
              label="Fecha de nacimiento"
              placeholder="YYYY-MM-DD"
              value={form.birthday_date}
              onChangeText={(v) => updateField('birthday_date', v)}
              containerStyle={styles.halfInput}
              icon={<Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />}
            />
            <View style={styles.halfInput}>
              <Text style={styles.genderLabel}>Género</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => {
                  const value = option === 'Hombre' ? 'M' : 'F';
                  const isSelected = form.gender === value;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.genderBtn, isSelected && styles.genderBtnActive]}
                      onPress={() => updateField('gender', value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={option === 'Hombre' ? 'male' : 'female'}
                        size={16}
                        color={isSelected ? Colors.white : Colors.primary}
                      />
                      <Text style={[styles.genderText, isSelected && styles.genderTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>CONTACTO</Text>
          <FormInput
            label="Teléfono *"
            placeholder="Ej: 04121234567"
            value={form.phone}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
            error={errors.phone}
            icon={<Ionicons name="call-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Teléfono opcional"
            placeholder="Ej: 04241234567"
            value={form.phone_optional}
            onChangeText={(v) => updateField('phone_optional', v)}
            keyboardType="phone-pad"
            icon={<Ionicons name="call-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Email"
            placeholder="Ej: correo@ejemplo.com"
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            icon={<Ionicons name="mail-outline" size={20} color={Colors.textMuted} />}
          />

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>UBICACIÓN</Text>
          <FormInput
            label="Dirección"
            placeholder="Ej: Calle 10, Casa 5"
            value={form.address}
            onChangeText={(v) => updateField('address', v)}
            icon={<Ionicons name="location-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Punto de referencia"
            placeholder="Ej: Frente a la farmacia"
            value={form.address_reference}
            onChangeText={(v) => updateField('address_reference', v)}
            icon={<Ionicons name="navigate-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Parroquia / Sector"
            placeholder="Ej: Barrio Central"
            value={form.parish}
            onChangeText={(v) => updateField('parish', v)}
            icon={<Ionicons name="map-outline" size={20} color={Colors.textMuted} />}
          />

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>VISITA</Text>
          <View style={styles.row}>
            <FormInput
              label="Día de visita"
              placeholder="YYYY-MM-DD"
              value={form.visit_day}
              onChangeText={(v) => updateField('visit_day', v)}
              containerStyle={styles.halfInput}
              icon={<Ionicons name="calendar" size={20} color={Colors.textMuted} />}
            />
            <FormInput
              label="Hora"
              placeholder="HH:MM"
              value={form.visit_time}
              onChangeText={(v) => updateField('visit_time', v)}
              containerStyle={styles.halfInput}
              icon={<Ionicons name="time-outline" size={20} color={Colors.textMuted} />}
            />
          </View>
          <FormInput
            label="Comentarios"
            placeholder="Notas adicionales"
            value={form.comments}
            onChangeText={(v) => updateField('comments', v)}
            icon={<Ionicons name="chatbubble-outline" size={20} color={Colors.textMuted} />}
          />
        </View>

        <Button
          title="Guardar Registro"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
          icon={<Ionicons name="save-outline" size={20} color={Colors.white} />}
        />
      </ScrollView>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={[
                styles.modalIcon,
                modalIsOffline ? styles.modalIconOffline : styles.modalIconOnline,
              ]}
            >
              <Ionicons
                name={modalIsOffline ? 'cloud-offline' : 'checkmark-circle'}
                size={48}
                color={Colors.white}
              />
            </View>
            <Text style={styles.modalTitle}>
              {modalIsOffline ? '¡Guardado Offline!' : '¡Registro Exitoso!'}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalGoldLine} />
            <Button title="Aceptar" onPress={() => setShowModal(false)} style={styles.modalButton} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ... los estilos quedan exactamente iguales

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: Spacing.xs, paddingBottom: Spacing.xxl * 2 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.xl, paddingHorizontal: Spacing.md },

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
    debugFillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: Spacing.sm,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(0, 102, 204, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0, 102, 204, 0.1)',
        alignSelf: 'flex-start'
    },
    debugFillText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary,
        textTransform: 'uppercase'
    },
});
