export interface Persona {
    id: number;
    nombre: string;
    cedula: string;
    edad: string;
    telefono: string;
    telefono_opcional: string;
    email: string;
    direccion: string;
    punto_referencia: string;
    sector_barrio: string;
    fecha_nacimiento: string;
    genero: 'M' | 'F';
    synced: number; // 0 = pendiente, 1 = sincronizado
    created_at: string;
    registrant_id?: string;
}

export interface PersonaInput {
    nombre: string;
    cedula: string;
    edad: string;
    telefono: string;
    telefono_opcional: string;
    email: string;
    direccion: string;
    punto_referencia: string;
    sector_barrio: string;
    fecha_nacimiento: string;
    genero: 'M' | 'F';
    registrant_id?: string;
}

export interface User {
    id: number;
    username: string;
    nombre: string;
    role?: number; // 1: servidor, 2: coordinador, 3: admin
    token?: string;
    expiresAt?: number; // Timestamp
}

export interface SyncStats {
    total: number;
    synced: number;
    pending: number;
}
