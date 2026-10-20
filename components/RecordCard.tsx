import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { type Person } from '@/database/repositories/people.repository';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RecordCardProps {
    person: Person;
    onDelete?: (id: number) => void;
    onPress?: (person: Person) => void;
}

export function RecordCard({ person, onDelete, onPress }: RecordCardProps) {
    const isSynced = person.synced === 1;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress?.(person)}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.header}>
                <View style={styles.nameRow}>
                    <Ionicons name="person" size={18} color={Colors.primary} />
                    <Text style={styles.name} numberOfLines={1}>
                        {person.name} {person.last_name}
                    </Text>
                </View>
                <View style={[styles.badge, isSynced ? styles.badgeSynced : styles.badgePending]}>
                    <Ionicons
                        name={isSynced ? 'cloud-done' : 'cloud-offline'}
                        size={12}
                        color={isSynced ? Colors.success : Colors.warning}
                    />
                    <Text style={[styles.badgeText, isSynced ? styles.syncedText : styles.pendingText]}>
                        {isSynced ? 'Enviado' : 'Pendiente'}
                    </Text>
                </View>
            </View>

            <View style={styles.details}>
                <DetailRow icon="card" label="Cédula" value={person.dni} />
                <DetailRow icon="call" label="Tel" value={person.phone} />
            </View>

            <View style={styles.footer}>
                <Text style={styles.date}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />{' '}
                    {person.created_at}
                </Text>
                <View style={styles.footerActions}>
                    <TouchableOpacity
                        onPress={() => onPress?.(person)}
                        style={styles.actionBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="eye-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    {onDelete && (
                        <TouchableOpacity
                            onPress={() => onDelete(person.id)}
                            style={styles.actionBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={18} color={Colors.wine} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.detailRow}>
            <Ionicons name={icon as any} size={14} color={Colors.textMuted} />
            <Text style={styles.detailLabel}>{label}:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    name: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: '700',
        flex: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    badgeSynced: {
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
    },
    badgePending: {
        backgroundColor: 'rgba(243, 156, 18, 0.1)',
    },
    badgeText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    syncedText: {
        color: Colors.success,
    },
    pendingText: {
        color: Colors.warning,
    },
    details: {
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.cardBorder,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    detailLabel: {
        color: Colors.textMuted,
        fontSize: FontSize.sm,
        minWidth: 50,
    },
    detailValue: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    date: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
    },
    footerActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionBtn: {
        padding: Spacing.xs,
    },
});
