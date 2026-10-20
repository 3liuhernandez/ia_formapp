import { Colors, FontSize } from '@/constants/theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const LoadingScreen = () => {
    return (
        <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando...</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    loading: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: Colors.background, gap: 16,
    },
    loadingText: { color: Colors.textSecondary, fontSize: FontSize.md },
});