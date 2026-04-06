import type { PersonaInput } from '@/types';
import { getApiConfig } from './settings';

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
        const { apiUrl, apiKey } = await getApiConfig();
        
        // Remove trailing slash if present in apiUrl to avoid double slashes
        const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

        const response = await fetch(`${base}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-API-Key': apiKey,
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

export async function fetchPersonasLog(from?: string, to?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('limit', '10000'); // Export allows up to 10k items
    if (from) params.append('start_date', from);
    if (to) params.append('end_date', to);
    
    return request(`/personas?${params.toString()}`, {
        method: 'GET',
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
