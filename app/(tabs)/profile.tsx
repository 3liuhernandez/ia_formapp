import { Button } from '@/components/Button';
import { SyncBadge } from '@/components/SyncBadge';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getSyncStats } from '@/database/operations';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { SyncStats } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
    const db = useSQLiteContext();
    const { user, logout } = useAuth();
    const isConnected = useNetworkStatus();
    const [stats, setStats] = useState<SyncStats>({ total: 0, synced: 0, pending: 0 });
    const [profile, setProfile] = useState<any>(null);

    useFocusEffect(useCallback(() => {
        let mounted = true;
        const load = async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!mounted || !db) return;
            try {
                const s = await getSyncStats(db);
                if (mounted) setStats(s);
                const p = await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
                if (mounted) setProfile(p);
            } catch (e) {
                console.error(e);
            }
        };
        load();
        return () => { mounted = false; };
    }, [db]));

    const handleLogout = () => {
        Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar Sesión', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
        ]);
    };

    const syncPercentage = stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View><Text style={styles.title}>Mi Perfil</Text><View style={styles.goldLine} /></View>
                <SyncBadge isConnected={isConnected} pendingCount={stats.pending} />
            </View>

            <View style={styles.userCard}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={48} color={Colors.primary} />
                </View>
                <Text style={styles.userName}>{profile ? `${profile.nombres} ${profile.apellidos}` : (user?.nombre || 'Usuario')}</Text>
                <Text style={styles.userUsername}>{profile?.email || '-'}</Text>

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
                    <StatRow icon="documents" label="Total de registros" value={stats.total} color={Colors.primary} />
                    <View style={styles.divider} />
                    <StatRow icon="cloud-done" label="Sincronizados" value={stats.synced} color={Colors.success} />
                    <View style={styles.divider} />
                    <StatRow icon="time" label="Pendientes" value={stats.pending} color={Colors.warning} />
                    <View style={styles.divider} />
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.statLabel}>Progreso de sincronización</Text>
                            <Text style={[styles.statValue, { color: Colors.primary }]}>{syncPercentage}%</Text>
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
                    <InfoRow icon="call-outline" label="Teléfono" value={profile?.telefono || '-'} />
                    <View style={styles.divider} />
                    <InfoRow icon="mail-outline" label="Correo" value={profile?.email || '-'} />
                    <View style={styles.divider} />
                    <InfoRow icon="male-female-outline" label="Sexo" value={profile?.sexo === 'M' ? 'Hombre' : 'Mujer'} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Identificación de Dispositivo</Text>
                <View style={styles.statsCard}>
                    <InfoRow icon="phone-portrait-outline" label="Marca / Modelo" value={`${profile?.brand || '-'} / ${profile?.model || '-'}`} />
                    <View style={styles.divider} />
                    <InfoRow icon="hardware-chip-outline" label="ID Sistema" value={profile?.device_id || '-'} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sincronización</Text>
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Los registros se guardan localmente y se sincronizan automáticamente cuando hay internet.
                    </Text>
                </View>
            </View>

            <Button title="Cerrar Sesión" onPress={handleLogout} variant="danger" style={styles.logoutButton}
                icon={<Ionicons name="log-out-outline" size={20} color={Colors.white} />} />

            {/* App Version */}
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
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
        </View>
    );
}

function StatRow({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
    return (
        <View style={styles.statRow}>
            <View style={styles.statLeft}><Ionicons name={icon} size={20} color={color} /><Text style={styles.statLabel}>{label}</Text></View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
    );
}

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
    userName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
    userUsername: { color: Colors.textMuted, fontSize: FontSize.md, marginTop: Spacing.xs },
    editBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder,
    },
    editBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
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
});
