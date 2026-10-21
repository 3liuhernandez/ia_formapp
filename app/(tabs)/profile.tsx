import { Button } from '@/components/Button';
import { SyncBadge } from '@/components/SyncBadge';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { peopleRepo } from '@/database/repositories/people.repository';
import { profileRepo } from '@/database/repositories/profile.repository';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProfile } from '@/hooks/useProfile';
import { ApiConfig, getApiConfig, resetApiConfig, saveApiConfig } from '@/services/settings';
import { checkForUpdates, downloadAndInstallUpdate } from '@/services/update';
import type { SyncStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const ROLE_NAMES: Record<'register' | 'admin', string> = {
  register: 'Servidor',
  admin: 'Administrador',
};

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { user, logout, refreshHasProfile } = useAuth();
  const { profile } = useProfile();
  const isConnected = useNetworkStatus();

  const [stats, setStats] = useState<SyncStats>({ total: 0, synced: 0, pending: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<ApiConfig>({ apiUrl: '', apiKey: '' });
  const [tempConfig, setTempConfig] = useState<ApiConfig>({ apiUrl: '', apiKey: '' });
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        // Delay defensivo para no chocar con la animación de navegación
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!mounted || !db) return;
        try {
          const s = await peopleRepo.getStats(db);
          if (mounted) setStats(s);

          const c = await getApiConfig();
          if (mounted) {
            setConfig(c);
            setTempConfig(c);
          }
        } catch (e) {
          console.error(e);
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [db])
  );

  const handleSaveConfig = async () => {
    try {
      await saveApiConfig(tempConfig);
      setConfig(tempConfig);
      setShowSettings(false);
      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  const handleResetConfig = async () => {
    Alert.alert('Reiniciar', '¿Volver a la configuración por defecto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        onPress: async () => {
          await resetApiConfig();
          const c = await getApiConfig();
          setConfig(c);
          setTempConfig(c);
          setShowSettings(false);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleResetProfile = () => {
    Alert.alert(
      'Eliminar Perfil Local',
      'Esto borrará tu información de este dispositivo (nombres, cédula, etc). Deberás registrarte de nuevo. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Eliminación',
          style: 'destructive',
          onPress: async () => {
            try {
              // Re-leer por si cambió desde que se abrió la pantalla
              const current = await profileRepo.get(db);
              if (current) await profileRepo.delete(db, current.id);

              await refreshHasProfile();     // hasProfile = false → RootNavigation cambia a /register
              await logout();
              router.replace('/register');
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            }
          },
        },
      ]
    );
  };

  const handleCheckUpdates = async () => {
    if (!isConnected) {
      Alert.alert('Sin Conexión', 'Necesitas internet para buscar actualizaciones.');
      return;
    }
    setUpdating(true);
    try {
      const updateInfo = await checkForUpdates();
      if (updateInfo) {
        Alert.alert(
          'Actualización Disponible',
          `Existe una nueva versión: v${updateInfo.version}\n\n${updateInfo.releaseNotes || 'Mejoras de rendimiento y corrección de errores.'
          }\n\n¿Deseas descargar e instalar ahora?`,
          [
            { text: 'Ahora no', style: 'cancel', onPress: () => setUpdating(false) },
            {
              text: 'Actualizar',
              onPress: () => {
                downloadAndInstallUpdate(updateInfo.downloadUrl, (p) =>
                  setUpdateProgress(p)
                ).finally(() => {
                  setUpdating(false);
                  setUpdateProgress(0);
                });
              },
            },
          ]
        );
      } else {
        setUpdating(false);
        Alert.alert('Sin actualizaciones', 'Ya tienes instalada la versión más reciente.');
      }
    } catch {
      setUpdating(false);
      Alert.alert('Error', 'No se pudo verificar la actualización.');
    }
  };

  const syncPercentage =
    stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mi Perfil</Text>
          <View style={styles.goldLine} />
        </View>
        <SyncBadge isConnected={isConnected} pendingCount={stats.pending} />
      </View>

      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.userName}>
          {profile ? `${profile.name} ${profile.last_name}` : user?.name || 'Usuario'}
        </Text>
        <Text style={styles.userUsername}>{profile?.email || '-'}</Text>

        {user?.role_name && (
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.white} />
            <Text style={styles.roleBadgeText}>
              {ROLE_NAMES[user.role_name] || 'Usuario'}
            </Text>
          </View>
        )}

        {profile && (
          <TouchableOpacity
            style={styles.editBadge}
            onPress={() => router.push('/register')}
          >
            <Ionicons name="create-outline" size={14} color={Colors.primary} />
            <Text style={styles.editBadgeText}>Editar Perfil</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <View style={styles.statsCard}>
          <StatRow
            icon="documents"
            label="Total de registros"
            value={stats.total}
            color={Colors.primary}
          />
          <View style={styles.divider} />
          <StatRow
            icon="cloud-done"
            label="Sincronizados"
            value={stats.synced}
            color={Colors.success}
          />
          <View style={styles.divider} />
          <StatRow
            icon="time"
            label="Pendientes"
            value={stats.pending}
            color={Colors.warning}
          />
          <View style={styles.divider} />
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.statLabel}>Progreso de sincronización</Text>
              <Text style={[styles.statValue, { color: Colors.primary }]}>
                {syncPercentage}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${syncPercentage}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mi Información</Text>
        <View style={styles.statsCard}>
          <InfoRow icon="call-outline" label="Teléfono" value={profile?.phone || '-'} />
          <View style={styles.divider} />
          <InfoRow icon="mail-outline" label="Correo" value={profile?.email || '-'} />
          <View style={styles.divider} />
          <InfoRow
            icon="male-female-outline"
            label="Sexo"
            value={!profile ? '-' : profile.gender === 'M' ? 'Hombre' : 'Mujer'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identificación de Dispositivo</Text>
        <View style={styles.statsCard}>
          <InfoRow
            icon="phone-portrait-outline"
            label="Marca / Modelo"
            value={`${profile?.brand || '-'} / ${profile?.model || '-'}`}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="hardware-chip-outline"
            label="ID Sistema"
            value={profile?.device_id || '-'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sincronización</Text>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Los registros se guardan localmente y se sincronizan automáticamente cuando hay
            internet.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sistema y Actualización</Text>
        <View style={styles.statsCard}>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleCheckUpdates}
            disabled={updating}
          >
            <View
              style={[
                styles.settingsIcon,
                updating && { backgroundColor: 'rgba(52, 152, 219, 0.1)' },
              ]}
            >
              {updating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={Colors.primary} />
              )}
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsLabel}>
                {updating ? 'Descargando...' : 'Buscar Actualización'}
              </Text>
              <Text style={styles.settingsValue}>
                {updating
                  ? `Progreso: ${Math.round(updateProgress * 100)}%`
                  : 'Recuerda que estas actualizaciones son fuera de la tienda.'}
              </Text>
            </View>
            {!updating && (
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => setShowSettings(true)}
          >
            <View style={styles.settingsIcon}>
              <Ionicons name="settings-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsLabel}>Conexión con la API</Text>
              <Text style={styles.settingsValue} numberOfLines={1}>
                {config.apiUrl}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones de Cuenta</Text>
        <View style={styles.statsCard}>
          <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
            <View
              style={[styles.settingsIcon, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: Colors.error }]}>
                Cerrar Sesión
              </Text>
              <Text style={styles.settingsValue}>Salir de la cuenta actual</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingsItem} onPress={handleResetProfile}>
            <View
              style={[styles.settingsIcon, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: Colors.error }]}>
                Borrar Perfil Local
              </Text>
              <Text style={styles.settingsValue}>Elimina tus datos de este equipo</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: Spacing.lg }]}>
          <View style={[styles.modalContent, { borderRadius: BorderRadius.xl, maxHeight: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuración de API</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalGoldLine} />

            <Text style={styles.settingsHint}>
              Establece la dirección del servidor y tu clave de API si es diferente a la
              configurada por defecto.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL de la API</Text>
              <TextInput
                style={styles.textInput}
                value={tempConfig.apiUrl}
                onChangeText={(v) => setTempConfig({ ...tempConfig, apiUrl: v })}
                placeholder="http://192.168.1.x:3001/api/v1"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Key (X-API-Key)</Text>
              <TextInput
                style={styles.textInput}
                value={tempConfig.apiKey}
                onChangeText={(v) => setTempConfig({ ...tempConfig, apiKey: v })}
                placeholder="Ingresa la clave de seguridad"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.settingsActions}>
              <Button
                title="Reiniciar"
                onPress={handleResetConfig}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar Cambios"
                onPress={handleSaveConfig}
                style={{ flex: 2 }}
                icon={<Ionicons name="save-outline" size={18} color={Colors.white} />}
              />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.versionContainer}>
        <Text style={styles.appName}>ElimAPP</Text>
        <Text style={styles.appFullName}>Eliam APP · Iglesia de la Cruz</Text>
        <View style={styles.versionGoldLine} />
        <Text style={styles.versionText}>Versión {APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statLeft}>
        <Ionicons name={icon} size={20} color={Colors.textMuted} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statLeft}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// ... los styles quedan igual que en tu archivo original

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
  title: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  goldLine: { width: 40, height: 3, backgroundColor: Colors.gold, borderRadius: 2, marginTop: Spacing.xs },
  userCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.lg,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarContainer: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.surface, alignItems: 'center',
    justifyContent: 'center', marginBottom: Spacing.md, borderWidth: 2, borderColor: Colors.gold,
  },
  userName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center' },
  userUsername: { color: Colors.textMuted, fontSize: FontSize.md, marginTop: Spacing.xs },
  editBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  editBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  roleBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: 'bold', textTransform: 'uppercase' },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.wine, fontSize: FontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },
  statsCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.cardBorder, shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '800' },
  divider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.xs },
  progressSection: { paddingTop: Spacing.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  progressBarBg: { height: 8, backgroundColor: Colors.surface, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.cardBorder, flexDirection: 'row', gap: Spacing.md,
  },
  infoText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1, lineHeight: 20 },
  infoValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', maxWidth: '60%' },
  logoutButton: { marginTop: Spacing.sm },
  // Version
  versionContainer: { alignItems: 'center', marginTop: Spacing.xl, paddingTop: Spacing.lg },
  appName: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: '800', letterSpacing: 1 },
  appFullName: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs },
  versionGoldLine: { width: 30, height: 2, backgroundColor: Colors.gold, borderRadius: 1, marginVertical: Spacing.sm },
  versionText: { color: Colors.textMuted, fontSize: FontSize.xs },
  // Modal & Settings styles
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg, maxHeight: '90%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  modalGoldLine: { width: 50, height: 3, backgroundColor: Colors.gold, borderRadius: 2, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  settingsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  settingsContent: { flex: 1 },
  settingsLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  settingsValue: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  settingsHint: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.lg, lineHeight: 20 },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  textInput: { backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.inputBorder, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md },
  settingsActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
});
