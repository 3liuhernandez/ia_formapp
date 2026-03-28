import * as SecureStore from 'expo-secure-store';

const KEY_API_URL = 'api_url';
const KEY_API_KEY = 'api_key';

export interface ApiConfig {
    apiUrl: string;
    apiKey: string;
}

export async function getApiConfig(): Promise<ApiConfig> {
    try {
        const storedUrl = await SecureStore.getItemAsync(KEY_API_URL);
        const storedKey = await SecureStore.getItemAsync(KEY_API_KEY);

        return {
            apiUrl: storedUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
            apiKey: storedKey || process.env.EXPO_PUBLIC_API_KEY || '',
        };
    } catch (e) {
        return {
            apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
            apiKey: process.env.EXPO_PUBLIC_API_KEY || '',
        };
    }
}

export async function saveApiConfig(config: ApiConfig): Promise<void> {
    await SecureStore.setItemAsync(KEY_API_URL, config.apiUrl);
    await SecureStore.setItemAsync(KEY_API_KEY, config.apiKey);
}

export async function resetApiConfig(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_API_URL);
    await SecureStore.deleteItemAsync(KEY_API_KEY);
}
