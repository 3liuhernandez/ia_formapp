import { Button } from '@/components/Button';
import { RecordCard } from '@/components/RecordCard';
import { SyncBadge } from '@/components/SyncBadge';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
    deletePersona,
    getAllPersonas,
    getPersonasByDateRange,
    getSyncStats, searchPersonas,
} from '@/database/operations';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { fetchPersonasLog } from '@/services/api';
import { exportToExcel } from '@/services/export';
import { syncPendingRecords } from '@/services/sync';
import type { Persona, SyncStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function RecordsScreen() {
    const db = useSQLiteContext();
    const { user } = useAuth();
    const isConnected = useNetworkStatus();
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [stats, setStats] = useState<SyncStats>({ total: 0, synced: 0, pending: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFrom, setExportFrom] = useState('');
    const [exportTo, setExportTo] = useState('');
    const [exporting, setExporting] = useState(false);

    const loadData = useCallback(async () => {
        // Delay para evitar crash nativo durante la navegación/animación
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            if (!db) return;
            const data = search.trim() ? await searchPersonas(db, search.trim()) : await getAllPersonas(db);
            setPersonas(data);
            setStats(await getSyncStats(db));
        } catch (err) { console.error('Error loading data:', err); }
    }, [db, search]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

    const handleDelete = (id: number) => {
        Alert.alert('Eliminar registro', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => { await deletePersona(db, id); await loadData(); } },
        ]);
    };

    const handleSync = async () => {
        if (!isConnected) { Alert.alert('Sin conexión', 'Necesitas internet para sincronizar'); return; }
        setSyncing(true);
        try {
            const result = await syncPendingRecords(db);
            await loadData();
            Alert.alert('Sincronización', `Enviados: ${result.synced}\nFallidos: ${result.failed}`);
        } catch (err: any) { 
            Alert.alert('Error', `Error durante la sincronización: ${err.message || 'Verifica la conexión con el servidor'}`); 
        }
        finally { setSyncing(false); }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            let localData: Persona[] = [];
            let serverData: Persona[] = [];
            let from = '', to = '';

            if (exportFrom && exportTo) {
                // Convert DD/MM/YYYY to YYYY-MM-DD for SQLite
                const fromParts = exportFrom.split('/');
                const toParts = exportTo.split('/');
                from = fromParts.length === 3 ? `${fromParts[2]}-${fromParts[1]}-${fromParts[0]}` : exportFrom;
                to = toParts.length === 3 ? `${toParts[2]}-${toParts[1]}-${toParts[0]}` : exportTo;
                localData = await getPersonasByDateRange(db, from, to);
            } else {
                localData = await getAllPersonas(db);
            }

            if (isConnected) {
                try {
                    const apiResponse = await fetchPersonasLog(from, to);
                    if (apiResponse.success && Array.isArray(apiResponse.data)) {
                        serverData = apiResponse.data;
                    }
                } catch (e) {
                    console.warn('[Export] Could not fetch API records', e);
                }
            }

            // Deduplication logic
            const mergedMap = new Map<string, Persona>();

            const processRecord = (p: Persona) => {
                // User requested key: Person Cedula + Registrant Cedula
                // If person has no cedula: Normalized Name + Registrant Cedula
                const registrantId = p.registrant_id || user?.cedula || 'UNKNOWN';
                let key = '';
                
                if (p.cedula && p.cedula.trim()) {
                    key = `ID_${p.cedula.trim()}_REG_${registrantId}`;
                } else {
                    const normalizedName = p.nombre ? p.nombre.toLowerCase().replace(/\s+/g, '') : 'NONAME';
                    key = `NAME_${normalizedName}_REG_${registrantId}`;
                }
                
                // Keep the first one we see (server data prioritized as it's processed first)
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, p);
                }
            };

            // Prefer server data over local
            serverData.forEach(processRecord);
            localData.forEach(processRecord);

            const data = Array.from(mergedMap.values());

            if (data.length === 0) {
                Alert.alert('Sin datos', 'No hay registros para exportar en ese rango de fechas');
                setExporting(false);
                return;
            }

            await exportToExcel(data);
            setShowExportModal(false);
            setExportFrom('');
            setExportTo('');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Error al exportar');
        } finally { setExporting(false); }
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
                    <Button title="Sincronizar" onPress={handleSync} variant="outline" loading={syncing}
                        style={styles.actionBtn} icon={<Ionicons name="sync" size={16} color={Colors.primary} />} />
                )}
                {(user?.role === 2 || user?.role === 3) && (
                    <Button title="Exportar Excel" onPress={() => setShowExportModal(true)} variant="secondary"
                        style={styles.actionBtn}
                        icon={<Ionicons name="download-outline" size={16} color={Colors.text} />} />
                )}
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} />
                <TextInput style={styles.searchInput} placeholder="Buscar por nombre, cédula..."
                    placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} selectionColor={Colors.primary} />
                {search.length > 0 && <Ionicons name="close-circle" size={20} color={Colors.textMuted} onPress={() => setSearch('')} />}
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
        <View style={styles.container}>
            <View style={styles.header}>
                <View><Text style={styles.title}>Registros</Text><View style={styles.goldLine} /></View>
                <SyncBadge isConnected={isConnected} pendingCount={stats.pending} />
            </View>

            <FlatList data={personas} keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <RecordCard persona={item} onDelete={handleDelete} onPress={setSelectedPersona} />}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
                showsVerticalScrollIndicator={false} />

            {/* Detail Modal */}
            <Modal visible={!!selectedPersona} transparent animationType="slide" onRequestClose={() => setSelectedPersona(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalle del Registro</Text>
                            <TouchableOpacity onPress={() => setSelectedPersona(null)}>
                                <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalGoldLine} />
                        {selectedPersona && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailAvatar}>
                                    <Ionicons name="person" size={40} color={Colors.primary} />
                                </View>
                                <Text style={styles.detailName}>{selectedPersona.nombre}</Text>
                                <View style={[styles.detailBadge, selectedPersona.synced === 1 ? styles.badgeSynced : styles.badgePending]}>
                                    <Ionicons name={selectedPersona.synced === 1 ? 'cloud-done' : 'cloud-offline'} size={14}
                                        color={selectedPersona.synced === 1 ? Colors.success : Colors.warning} />
                                    <Text style={{ color: selectedPersona.synced === 1 ? Colors.success : Colors.warning, fontSize: FontSize.sm, fontWeight: '600' }}>
                                        {selectedPersona.synced === 1 ? 'Sincronizado' : 'Pendiente de envío'}
                                    </Text>
                                </View>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>DATOS PERSONALES</Text>
                                    <DetailField icon="card" label="Cédula" value={selectedPersona.cedula} />
                                    <DetailField icon="calendar-number" label="Edad" value={selectedPersona.edad || '-'} />
                                    <DetailField icon="calendar" label="Fecha Nac." value={selectedPersona.fecha_nacimiento || '-'} />
                                    <DetailField icon="male-female" label="Género" value={selectedPersona.genero === 'M' ? 'Hombre' : 'Mujer'} />
                                </View>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>CONTACTO</Text>
                                    <DetailField icon="call" label="Teléfono" value={selectedPersona.telefono} />
                                    <DetailField icon="call" label="Tel. Opcional" value={selectedPersona.telefono_opcional || '-'} />
                                    <DetailField icon="mail" label="Email" value={selectedPersona.email || '-'} />
                                </View>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>UBICACIÓN</Text>
                                    <DetailField icon="location" label="Dirección" value={selectedPersona.direccion || '-'} />
                                    <DetailField icon="navigate" label="Referencia" value={selectedPersona.punto_referencia || '-'} />
                                    <DetailField icon="map" label="Sector/Barrio" value={selectedPersona.sector_barrio || '-'} />
                                </View>
                                <DetailField icon="time" label="Registrado" value={selectedPersona.created_at} />
                                <Button title="Cerrar" onPress={() => setSelectedPersona(null)} variant="secondary" style={{ marginTop: Spacing.sm }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Export Modal */}
            <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
                <View style={styles.exportOverlay}>
                    <View style={styles.exportContent}>
                        <Text style={styles.exportTitle}>Exportar a Excel</Text>
                        <View style={styles.modalGoldLine} />
                        <Text style={styles.exportHint}>Deja vacío para exportar todos los registros</Text>
                        <FormInputSmall label="Desde (DD/MM/AAAA)" placeholder="01/01/2025" value={exportFrom}
                            onChangeText={setExportFrom} keyboardType="numeric" />
                        <FormInputSmall label="Hasta (DD/MM/AAAA)" placeholder="31/12/2025" value={exportTo}
                            onChangeText={setExportTo} keyboardType="numeric" />
                        <View style={styles.exportActions}>
                            <Button title="Cancelar" onPress={() => { setShowExportModal(false); setExportFrom(''); setExportTo(''); }}
                                variant="secondary" style={{ flex: 1 }} />
                            <Button title="Exportar" onPress={handleExport} loading={exporting} style={{ flex: 1 }}
                                icon={<Ionicons name="download-outline" size={18} color={Colors.white} />} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function FormInputSmall({ label, ...props }: { label: string; placeholder: string; value: string; onChangeText: (v: string) => void; keyboardType?: any }) {
    return (
        <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs }}>{label}</Text>
            <TextInput style={{
                backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md, borderWidth: 1,
                borderColor: Colors.inputBorder, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md,
            }} placeholderTextColor={Colors.textMuted} selectionColor={Colors.primary} {...props} />
        </View>
    );
}

function DetailField({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={dfStyles.row}>
            <View style={dfStyles.iconBox}><Ionicons name={icon as any} size={18} color={Colors.primary} /></View>
            <View style={dfStyles.textBox}>
                <Text style={dfStyles.label}>{label}</Text>
                <Text style={dfStyles.value}>{value}</Text>
            </View>
        </View>
    );
}
const dfStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    iconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
    textBox: { flex: 1 },
    label: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 2 },
    value: { color: Colors.text, fontSize: FontSize.md, fontWeight: '500' },
});

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
    return (
        <View style={scStyles.card}><Ionicons name={icon} size={22} color={color} />
            <Text style={[scStyles.value, { color }]}>{value}</Text>
            <Text style={scStyles.label}>{label}</Text></View>
    );
}
const scStyles = StyleSheet.create({
    card: {
        flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center',
        borderWidth: 1, borderColor: Colors.cardBorder, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    value: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.xs },
    label: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl + Spacing.lg, paddingBottom: Spacing.md
    },
    title: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: '800' },
    goldLine: { width: 40, height: 3, backgroundColor: Colors.gold, borderRadius: 2, marginTop: Spacing.xs },
    listContent: { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing.xxl * 2 },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    actionBtn: { flex: 1 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg,
        borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.inputBorder, marginBottom: Spacing.lg
    },
    searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl * 2 },
    emptyTitle: { color: Colors.textSecondary, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md },
    emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs },
    // Detail Modal
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg, maxHeight: '90%', minHeight: '50%'
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
    modalGoldLine: { width: 50, height: 3, backgroundColor: Colors.gold, borderRadius: 2, marginTop: Spacing.sm, marginBottom: Spacing.lg },
    detailAvatar: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surface, alignItems: 'center',
        justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md, borderWidth: 2, borderColor: Colors.gold
    },
    detailName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
    detailBadge: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.full, alignSelf: 'center', marginBottom: Spacing.lg
    },
    badgeSynced: { backgroundColor: 'rgba(39, 174, 96, 0.1)' },
    badgePending: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
    detailSection: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1,
        borderColor: Colors.cardBorder, marginBottom: Spacing.md
    },
    detailSectionTitle: { color: Colors.wine, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.md },
    // Export Modal
    exportOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
    exportContent: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, width: '100%', maxWidth: 380,
        shadowColor: Colors.black, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10
    },
    exportTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
    exportHint: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.lg },
    exportActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
