import type { Person } from '@/database/repositories/people.repository';
import * as SecureStore from 'expo-secure-store';
import { getApiConfig } from './settings';

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
}

/** Mapea Person (DB inglés) → payload API (español). */
export function personToApiPayload(p: Person) {
    return {
        nombre: p.name,
        cedula: p.dni,
        telefono: p.phone,
        telefono_opcional: p.phone_optional,
        email: p.email,
        direccion: p.address,
        punto_referencia: p.address_reference,
        sector_barrio: p.parish,
        fecha_nacimiento: p.birthday_date,
        genero: p.gender,
        registrant_id: p.registrant_dni || '',
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
