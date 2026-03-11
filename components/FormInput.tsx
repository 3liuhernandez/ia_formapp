import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';

interface FormInputProps extends TextInputProps {
    label: string;
    error?: string;
    containerStyle?: ViewStyle;
    icon?: React.ReactNode;
}

export function FormInput({
    label,
    error,
    containerStyle,
    icon,
    ...props
}: FormInputProps) {
    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
                {icon && <View style={styles.iconWrapper}>{icon}</View>}
                <TextInput
                    style={[styles.input, icon ? styles.inputWithIcon : null]}
                    placeholderTextColor={Colors.textMuted}
                    selectionColor={Colors.primary}
                    {...props}
                />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    label: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.xs + 2,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.inputBg,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.inputBorder,
    },
    inputError: {
        borderColor: Colors.error,
    },
    iconWrapper: {
        paddingLeft: Spacing.md,
    },
    input: {
        flex: 1,
        color: Colors.text,
        fontSize: FontSize.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        minHeight: 50,
    },
    inputWithIcon: {
        paddingLeft: Spacing.sm,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSize.xs,
        marginTop: Spacing.xs,
        marginLeft: Spacing.xs,
    },
});
