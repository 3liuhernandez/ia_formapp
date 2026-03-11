import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SyncBadgeProps {
    isConnected: boolean;
    pendingCount?: number;
}

export function SyncBadge({ isConnected, pendingCount = 0 }: SyncBadgeProps) {
    return (
        <View style={[styles.container, isConnected ? styles.online : styles.offline]}>
            <Ionicons
                name={isConnected ? 'wifi' : 'wifi-outline'}
                size={14}
                color={isConnected ? Colors.success : Colors.warning}
            />
            <Text style={[styles.text, isConnected ? styles.onlineText : styles.offlineText]}>
                {isConnected ? 'En línea' : 'Sin conexión'}
            </Text>
            {pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{pendingCount}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.sm + 4,
        paddingVertical: Spacing.xs + 2,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    online: {
        backgroundColor: 'rgba(39, 174, 96, 0.08)',
        borderColor: 'rgba(39, 174, 96, 0.3)',
    },
    offline: {
        backgroundColor: 'rgba(243, 156, 18, 0.08)',
        borderColor: 'rgba(243, 156, 18, 0.3)',
    },
    text: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    onlineText: {
        color: Colors.success,
    },
    offlineText: {
        color: Colors.warning,
    },
    pendingBadge: {
        backgroundColor: Colors.wine,
        borderRadius: BorderRadius.full,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    pendingText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '800',
    },
});
