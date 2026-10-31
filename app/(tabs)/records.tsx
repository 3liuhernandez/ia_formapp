import { Button } from '@/components/Button';
import { RecordCard } from '@/components/RecordCard';
import { SyncBadge } from '@/components/SyncBadge';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  peopleRepo,
  type Person,
} from '@/database/repositories/people.repository';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { fetchPersonasLog } from '@/services/api';
import { exportToExcel } from '@/services/export';
import { syncPendingRecords } from '@/services/sync';
import type { SyncStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

function apiToPerson(api: any): Person {
  return {
    id: api.id ?? 0,
    dni: api.dni ?? '',
    name: api.name ?? '',
    last_name: api.last_name ?? '',
    phone: api.phone ?? '',
    phone_optional: api.phone_optional ?? '',
    email: api.email ?? '',
    address: api.address ?? '',
    parish: api.parish ?? '',
    address_reference: api.address_reference ?? '',
    gender: api.gender ?? 'M',
    birthday_date: api.birthday_date ?? '',
    comments: api.comments ?? '',
    visit_day: api.visit_day ?? '',
    visit_time: api.visit_time ?? '',
    registrant_dni: api.registrant_dni || null,
    synced: 1,
    created_at: api.received_at ?? api.created_at ?? '',
  };
}

export default function RecordsScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const isConnected = useNetworkStatus();

  const [people, setPeople] = useState<Person[]>([]);
  const [stats, setStats] = useState<SyncStats>({ total: 0, synced: 0, pending: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const isRegisterRole = user?.role_name === 'register';
  const isAdminRole = user?.role_name === 'admin';
  const registrantDni = user?.profile?.dni ?? null;

  const loadData = useCallback(async () => {
    // Delay para evitar crash nativo durante animación
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      if (!db || !user) return;

      let data: Person[] = [];

      if (isRegisterRole) {
        // Rol register: solo sus propios registros de las últimas 24h
        if (registrantDni) {
          data = await peopleRepo.getByRegistrantRecent(db, registrantDni, 24);
        }
        if (search.trim()) {
          const term = search.trim().toLowerCase();
          data = data.filter(
            (p) =>
              p.name.toLowerCase().includes(term) ||
              p.dni.toLowerCase().includes(term) ||
              p.phone.toLowerCase().includes(term)
          );
        }
      } else {
        // admin: ve todo + búsqueda
        data = search.trim()
          ? await peopleRepo.search(db, search.trim())
          : await peopleRepo.list(db);
      }

      setPeople(data);

      const statsOpts =
        isRegisterRole && registrantDni
          ? { registrantDni, only24h: true }
          : undefined;
      setStats(await peopleRepo.getStats(db, statsOpts));
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, [db, search, user, isRegisterRole, registrantDni]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Eliminar registro', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await peopleRepo.delete(db, id);
          await loadData();
        },
      },
    ]);
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Sin conexión', 'Necesitas internet para sincronizar');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncPendingRecords(db);
      await loadData();
      Alert.alert(
        'Sincronización',
        `Enviados: ${result.synced}\nFallidos: ${result.failed}`
      );
    } catch (err) {
      Alert.alert(
        'Error',
        `Error durante la sincronización: ${err instanceof Error ? err.message : 'Verifica la conexión'
        }`
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let localData: Person[] = [];
      let serverData: Person[] = [];
      let from = '';
      let to = '';

      if (exportFrom && exportTo) {
        // DD/MM/YYYY → YYYY-MM-DD
        const fromParts = exportFrom.split('/');
        const toParts = exportTo.split('/');
        from = fromParts.length === 3
          ? `${fromParts[2]}-${fromParts[1]}-${fromParts[0]}`
          : exportFrom;
        to = toParts.length === 3
          ? `${toParts[2]}-${toParts[1]}-${toParts[0]}`
          : exportTo;
        localData = await peopleRepo.getByDateRange(db, from, to);
      } else {
        localData = await peopleRepo.list(db);
      }

      if (isConnected) {
        try {
          const apiResponse = await fetchPersonasLog(from, to);
          if (apiResponse.success && Array.isArray(apiResponse.data)) {
            serverData = apiResponse.data.map(apiToPerson);
          }
        } catch (e) {
          console.warn('[Export] No se pudo consultar la API:', e);
        }
      }

      const fallbackRegistrant = registrantDni || 'UNKNOWN';

      // Dedup: llave = (DNI persona + DNI registrante) o (nombre normalizado + DNI registrante)
      const merged = new Map<string, Person>();

      const processRecord = (p: Person) => {
        const registrant = p.registrant_dni || fallbackRegistrant;
        const key =
          p.dni && p.dni.trim()
            ? `ID_${p.dni.trim()}_REG_${registrant}`
            : `NAME_${(p.name || '').toLowerCase().replace(/\s+/g, '')}_REG_${registrant}`;

        // Priorizamos server (primero el que entra)
        if (!merged.has(key)) merged.set(key, p);
      };

      serverData.forEach(processRecord);
      localData.forEach(processRecord);

      const data = Array.from(merged.values());

      if (data.length === 0) {
        Alert.alert(
          'Sin datos',
          'No hay registros para exportar en ese rango de fechas'
        );
        setExporting(false);
        return;
      }

      await exportToExcel(data);
      setShowExportModal(false);
      setExportFrom('');
      setExportTo('');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Error al exportar'
      );
    } finally {
      setExporting(false);
    }
  };

  const renderHeader = () => (
    <View>
      <View style={styles.statsRow}>
        <StatCard icon="documents" label="Total" value={stats.total} color={Colors.primary} />
        <StatCard icon="cloud-done" label="Enviados" value={stats.synced} color={Colors.success} />
        <StatCard icon="time" label="Pendientes" value={stats.pending} color={Colors.warning} />
      </View>

      <View style={styles.actionRow}>
        {stats.pending > 0 && (
          <Button
            title="Sincronizar"
            onPress={handleSync}
            variant="outline"
            loading={syncing}
            style={styles.actionBtn}
            icon={<Ionicons name="sync" size={16} color={Colors.primary} />}
          />
        )}
        {isAdminRole && (
          <Button
            title="Exportar Excel"
            onPress={() => setShowExportModal(true)}
            variant="secondary"
            style={styles.actionBtn}
            icon={<Ionicons name="download-outline" size={16} color={Colors.text} />}
          />
        )}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, cédula..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          selectionColor={Colors.primary}
        />
        {search.length > 0 && (
          <Ionicons
            name="close-circle"
            size={20}
            color={Colors.textMuted}
            onPress={() => setSearch('')}
          />
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Sin registros</Text>
      <Text style={styles.emptySubtitle}>Los registros que guardes aparecerán aquí</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <FlatList
        data={people}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <RecordCard person={item} onDelete={handleDelete} onPress={setSelectedPerson} />
        )}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Registros</Text>
                <View style={styles.goldLine} />
              </View>
              <SyncBadge isConnected={isConnected} pendingCount={stats.pending} />
            </View>
            {renderHeader()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selectedPerson}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPerson(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del Registro</Text>
              <TouchableOpacity onPress={() => setSelectedPerson(null)}>
                <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalGoldLine} />
            {selectedPerson && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailAvatar}>
                  <Ionicons name="person" size={40} color={Colors.primary} />
                </View>
                <Text style={styles.detailName}>
                  {selectedPerson.name} {selectedPerson.last_name}
                </Text>
                <View
                  style={[
                    styles.detailBadge,
                    selectedPerson.synced === 1 ? styles.badgeSynced : styles.badgePending,
                  ]}
                >
                  <Ionicons
                    name={selectedPerson.synced === 1 ? 'cloud-done' : 'cloud-offline'}
                    size={14}
                    color={selectedPerson.synced === 1 ? Colors.success : Colors.warning}
                  />
                  <Text
                    style={{
                      color: selectedPerson.synced === 1 ? Colors.success : Colors.warning,
                      fontSize: FontSize.sm,
                      fontWeight: '600',
                    }}
                  >
                    {selectedPerson.synced === 1 ? 'Sincronizado' : 'Pendiente de envío'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>DATOS PERSONALES</Text>
                  <DetailField icon="card" label="Cédula" value={selectedPerson.dni} />
                  <DetailField
                    icon="calendar"
                    label="Fecha Nac."
                    value={selectedPerson.birthday_date || '-'}
                  />
                  <DetailField
                    icon="male-female"
                    label="Género"
                    value={selectedPerson.gender === 'M' ? 'Hombre' : 'Mujer'}
                  />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>CONTACTO</Text>
                  <DetailField icon="call" label="Teléfono" value={selectedPerson.phone} />
                  <DetailField
                    icon="call"
                    label="Tel. Opcional"
                    value={selectedPerson.phone_optional || '-'}
                  />
                  <DetailField icon="mail" label="Email" value={selectedPerson.email || '-'} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>UBICACIÓN</Text>
                  <DetailField
                    icon="location"
                    label="Dirección"
                    value={selectedPerson.address || '-'}
                  />
                  <DetailField
                    icon="navigate"
                    label="Referencia"
                    value={selectedPerson.address_reference || '-'}
                  />
                  <DetailField
                    icon="map"
                    label="Parroquia / Sector"
                    value={selectedPerson.parish || '-'}
                  />
                </View>

                {selectedPerson.comments ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>COMENTARIOS</Text>
                    <DetailField
                      icon="chatbubble"
                      label="Notas"
                      value={selectedPerson.comments}
                    />
                  </View>
                ) : null}

                {selectedPerson.visit_day ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>VISITA</Text>
                    <DetailField
                      icon="calendar"
                      label="Día"
                      value={selectedPerson.visit_day}
                    />
                    <DetailField
                      icon="time"
                      label="Hora"
                      value={selectedPerson.visit_time || '-'}
                    />
                  </View>
                ) : null}

                <DetailField icon="time" label="Registrado" value={selectedPerson.created_at} />
                <Button
                  title="Cerrar"
                  onPress={() => setSelectedPerson(null)}
                  variant="secondary"
                  style={{ marginTop: Spacing.sm }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.exportOverlay}>
          <View style={styles.exportContent}>
            <Text style={styles.exportTitle}>Exportar a Excel</Text>
            <View style={styles.modalGoldLine} />
            <Text style={styles.exportHint}>
              Deja vacío para exportar todos los registros
            </Text>
            <FormInputSmall
              label="Desde (DD/MM/AAAA)"
              placeholder="01/01/2025"
              value={exportFrom}
              onChangeText={setExportFrom}
              keyboardType="numeric"
            />
            <FormInputSmall
              label="Hasta (DD/MM/AAAA)"
              placeholder="31/12/2025"
              value={exportTo}
              onChangeText={setExportTo}
              keyboardType="numeric"
            />
            <View style={styles.exportActions}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setShowExportModal(false);
                  setExportFrom('');
                  setExportTo('');
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Exportar"
                onPress={handleExport}
                loading={exporting}
                style={{ flex: 1 }}
                icon={<Ionicons name="download-outline" size={18} color={Colors.white} />}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-componentes sin cambios ─────────────────────────────
function FormInputSmall({
  label,
  ...props
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text
        style={{
          color: Colors.primary,
          fontSize: FontSize.sm,
          fontWeight: '600',
          marginBottom: Spacing.xs,
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: Colors.inputBg,
          borderRadius: BorderRadius.md,
          borderWidth: 1,
          borderColor: Colors.inputBorder,
          padding: Spacing.md,
          color: Colors.text,
          fontSize: FontSize.md,
        }}
        placeholderTextColor={Colors.textMuted}
        selectionColor={Colors.primary}
        {...props}
      />
    </View>
  );
}

function DetailField({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={dfStyles.row}>
      <View style={dfStyles.iconBox}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={dfStyles.textBox}>
        <Text style={dfStyles.label}>{label}</Text>
        <Text style={dfStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const dfStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: { flex: 1 },
  label: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 2 },
  value: { color: Colors.text, fontSize: FontSize.md, fontWeight: '500' },
});

function StatCard({
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
    <View style={scStyles.card}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[scStyles.value, { color }]}>{value}</Text>
      <Text style={scStyles.label}>{label}</Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  value: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.xs },
  label: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
});

// ─── Styles sin cambios ─────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.xs, paddingBottom: Spacing.xxl * 2 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.xl, paddingHorizontal: Spacing.md },

  title: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  goldLine: {
    width: 40,
    height: 3,
    backgroundColor: Colors.gold,
    borderRadius: 2,
    marginTop: Spacing.xs,
  },
  listContent: { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing.xxl * 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  actionBtn: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl * 2 },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  modalGoldLine: {
    width: 50,
    height: 3,
    backgroundColor: Colors.gold,
    borderRadius: 2,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  detailName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  badgeSynced: { backgroundColor: 'rgba(39, 174, 96, 0.1)' },
  badgePending: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  detailSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  detailSectionTitle: {
    color: Colors.wine,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  exportContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  exportTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  exportHint: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.lg },
  exportActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});