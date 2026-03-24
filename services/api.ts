import type { PersonaInput } from '@/types';

// =============================================
// CONFIGURA AQUÍ TU API (Desde .env)
// =============================================
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// API Key para autenticación (Desde .env)
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';

// =============================================

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
}

async function request(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-API-Key': API_KEY,
                ...options.headers,
            },
            ...options,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || `Error ${response.status}`,
            };
        }

        return { success: true, data };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'Error de conexión',
        };
    }
}

export async function sendPersonaToApi(persona: PersonaInput): Promise<ApiResponse> {
    return request('/personas', {
        method: 'POST',
        body: JSON.stringify(persona),
    });
}

export async function sendBatchPersonas(personas: PersonaInput[]): Promise<ApiResponse> {
    return request('/personas/batch', {
        method: 'POST',
        body: JSON.stringify({ personas }),
    });
}

export async function loginToApi(
    username: string,
    password: string
): Promise<ApiResponse> {
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export { API_BASE_URL };

