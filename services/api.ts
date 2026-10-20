import type { Person } from '@/database/repositories/people.repository';
import * as SecureStore from 'expo-secure-store';
import { getApiConfig } from './settings';

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
}

/**
 * El server ahora usa los mismos nombres que la app.
 * Solo excluimos campos que el server no conoce (`id`, `synced`).
 */
export function personToApiPayload(p: Person) {
  return {
    dni: p.dni,
    name: p.name,
    last_name: p.last_name,
    phone: p.phone,
    phone_optional: p.phone_optional,
    email: p.email,
    address: p.address,
    parish: p.parish,
    address_reference: p.address_reference,
    gender: p.gender,
    birthday_date: p.birthday_date,
    comments: p.comments,
    visit_day: p.visit_day,
    visit_time: p.visit_time,
    registrant_dni: p.registrant_dni || '',
    created_at: p.created_at,   // ← preserva el timestamp real del cliente
  };
}

async function request(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
    try {
        const { apiUrl, apiKey } = await getApiConfig();
        const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

        const userData = await SecureStore.getItemAsync('user');
        const user = userData ? JSON.parse(userData) : null;

        const response = await fetch(`${base}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-API-Key': apiKey,
                ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
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

export async function sendPersonToApi(p: Person): Promise<ApiResponse> {
    return request('/personas', {
        method: 'POST',
        body: JSON.stringify(personToApiPayload(p)),
    });
}

export async function sendBatchPersonas(persons: Person[]): Promise<ApiResponse> {
    return request('/personas/batch', {
        method: 'POST',
        body: JSON.stringify({ personas: persons.map(personToApiPayload) }),
    });
}

export async function fetchPersonasLog(from?: string, to?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('limit', '10000');
    if (from) params.append('start_date', from);
    if (to) params.append('end_date', to);
    return request(`/personas?${params.toString()}`, { method: 'GET' });
}

export async function loginToApi(username: string, password: string): Promise<ApiResponse> {
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}
