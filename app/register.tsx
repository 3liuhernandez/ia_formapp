import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Profile } from '@/database/repositories/profile.repository';
import { useProfile } from '@/hooks/useProfile';
import { getApiConfig } from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

const GENDER_OPTIONS = ['Hombre', 'Mujer'] as const;

type FormState = {
  dni: string;
  name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
};

const EMPTY_FORM: FormState = {
  dni: '',
  name: '',
  last_name: '',
  phone: '',
  email: '',
  gender: 'M',
};

function coerceString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default function RegisterScreen() {
  const router = useRouter();
  const { refreshHasProfile, updateUserProfile } = useAuth();
  const { profile, loading: profileLoading, save } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hidratar form cuando el perfil ya cargó (modo edición)
  useEffect(() => {
    if (!profile) return;
    setIsEditing(true);
    setForm({
      dni: coerceString(profile.dni),
      name: coerceString(profile.name),
      last_name: coerceString(profile.last_name),
      phone: coerceString(profile.phone),
      email: coerceString(profile.email),
      gender: coerceString(profile.gender) || 'M',
    });
  }, [profile]);

  const fillRandomData = () => {
    const names = ['Juan', 'Pedro', 'Maria', 'Jose', 'Ana', 'Luis', 'Sofia', 'Carlos', 'Diego', 'Lucia'];
    const lastNames = ['Perez', 'Garcia', 'Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Hernandez', 'Diaz', 'Torres', 'Ramirez'];
    const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomDni = String(Math.floor(Math.random() * 20000000 + 10000000));
    const randomPhone = '0412' + Math.floor(Math.random() * 9000000 + 1000000);
    const randomEmail = `${randomName.toLowerCase()}.${randomLastName.toLowerCase()}${Math.floor(Math.random() * 100)}@${domains[Math.floor(Math.random() * domains.length)]}`;

    setForm({
      dni: randomDni,
      name: randomName,
      last_name: randomLastName,
      phone: randomPhone,
      email: randomEmail,
      gender: Math.random() > 0.5 ? 'M' : 'F',
    });
    setErrors({});
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isEditing && !coerceString(form.dni).trim()) {
      e.dni = 'La cédula es requerida';
    }
    if (!coerceString(form.name).trim()) e.name = 'El nombre es requerido';
    if (!coerceString(form.last_name).trim()) e.last_name = 'El apellido es requerido';
    if (!coerceString(form.phone).trim()) e.phone = 'El teléfono es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function handleCreate() {
    const saved = await save({
      dni: coerceString(form.dni).trim() || null,
      name: coerceString(form.name).trim(),
      last_name: coerceString(form.last_name).trim(),
      phone: coerceString(form.phone).trim(),
      email: coerceString(form.email).trim(),
      gender: coerceString(form.gender) || 'M',
      brand: Device.brand || '',
      model: Device.modelName || '',
      os_version: Device.osVersion || '',
      device_id: Device.osBuildId || '',
    });

    // Sync con API (fire-and-forget)
    syncProfileToApi(saved).catch((e) =>
      console.warn('[Register] API sync falló (se reintentará):', e)
    );

    await refreshHasProfile();
    Alert.alert('¡Éxito!', 'Perfil configurado correctamente.');
    router.replace('/login');
  }

  async function handleEdit() {

    if (!profile) {
      throw new Error('No hay perfil para editar');
    }

    const saved = await save({
      dni: profile.dni,
      name: coerceString(form.name).trim(),
      last_name: coerceString(form.last_name).trim(),
      phone: coerceString(form.phone).trim(),
      email: coerceString(form.email).trim(),
      gender: coerceString(form.gender) || 'M',
      brand: Device.brand || '',
      model: Device.modelName || '',
      os_version: Device.osVersion || '',
      device_id: Device.osBuildId || '',
    });

    // Sync con API (fire-and-forget)
    syncProfileToApi(saved).catch((e) =>
      console.warn('[Register] API sync falló (se reintentará):', e)
    );

    if (saved) await updateUserProfile(saved);
    Alert.alert('Éxito', 'Perfil actualizado correctamente');
    router.back();
  }

  async function syncProfileToApi(saved: Profile | null) {
    if (!saved) return;
    const { apiUrl, apiKey } = await getApiConfig();
    const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    await fetch(`${base}/registrants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        dni: saved.dni,
        name: saved.name,
        last_name: saved.last_name,
        phone: saved.phone,
        email: saved.email,
        gender: saved.gender,
        brand: saved.brand,
        model: saved.model,
        os_version: saved.os_version,
        device_id: saved.device_id,
      }),
    });
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEditing) {
        await handleEdit();
      } else {
        await handleCreate();
      }
    } catch (error) {
      console.error('[Register] Error guardando perfil:', error);
      Alert.alert(
        'Error',
        `No se pudo ${isEditing ? 'actualizar' : 'crear'} el perfil: ${error instanceof Error ? error.message : 'desconocido'
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  if (profileLoading) {
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
          <Ionicons
            name={isEditing ? 'create' : 'person-add'}
            size={40}
            color={Colors.primary}
          />
          <Text style={styles.title}>
            {isEditing ? 'Editar Perfil' : 'Configurar Perfil'}
          </Text>
          {!isEditing && (
            <Text style={styles.subtitle}>Solo necesitamos esto la primera vez</Text>
          )}
          <TouchableOpacity onPress={fillRandomData} style={styles.debugFillBtn}>
            <Ionicons name="flask-outline" size={14} color={Colors.primary} />
            <Text style={styles.debugFillText}>Llenar datos prueba</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {isEditing ? (
            <View style={styles.dniReadOnly}>
              <Text style={styles.dniReadOnlyLabel}>Cédula (no editable)</Text>
              <View style={styles.dniReadOnlyBox}>
                <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
                <Text style={styles.dniReadOnlyValue}>
                  {form.dni || '—'}
                </Text>
              </View>
              <Text style={styles.dniReadOnlyHint}>
                Si necesitas cambiar la cédula, elimina el perfil y créalo de nuevo.
              </Text>
            </View>
          ) : (
            <FormInput
              label="Cédula *"
              placeholder="Ej: 12345678"
              value={form.dni}
              onChangeText={(v) => updateField('dni', v)}
              keyboardType="numeric"
              error={errors.dni}
              icon={<Ionicons name="card-outline" size={20} color={Colors.textMuted} />}
            />
          )}
          <FormInput
            label="Nombres *"
            placeholder="Tus nombres"
            value={form.name}
            onChangeText={(v) => updateField('name', v)}
            error={errors.name}
            icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Apellidos *"
            placeholder="Tus apellidos"
            value={form.last_name}
            onChangeText={(v) => updateField('last_name', v)}
            error={errors.last_name}
            icon={<Ionicons name="person-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Teléfono *"
            placeholder="0412..."
            value={form.phone}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
            error={errors.phone}
            icon={<Ionicons name="call-outline" size={20} color={Colors.textMuted} />}
          />
          <FormInput
            label="Correo (Opcional)"
            placeholder="ejemplo@correo.com"
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Ionicons name="mail-outline" size={20} color={Colors.textMuted} />}
          />

          <View style={styles.genderSection}>
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => {
                const val = opt === 'Hombre' ? 'M' : 'F';
                const selected = form.gender === val;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.genderBtn, selected && styles.genderBtnActive]}
                    onPress={() => updateField('gender', val)}
                  >
                    <Text style={[styles.genderText, selected && styles.genderTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Button
            title={isEditing ? 'Guardar Cambios' : 'Comenzar'}
            onPress={handleRegister}
            loading={loading}
            style={styles.btn}
          />

          {isEditing && (
            <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>
            v{Constants.expoConfig?.version || '1.0.0'} (Build{' '}
            {Constants.expoConfig?.android?.versionCode || '1'})
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ... styles sin cambios

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
  cancelText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' },
  footer: {
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  versionText: {
    color: Colors.textMuted,
    fontSize: 10,
    opacity: 0.6,
  },
  debugFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 102, 204, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.1)',
  },
  debugFillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  dniReadOnly: {
    marginBottom: Spacing.md,
  },
  dniReadOnlyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  dniReadOnlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surface,   // gris para indicar "no editable"
  },
  dniReadOnlyValue: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  dniReadOnlyHint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 6,
    lineHeight: 16,
  },
});
