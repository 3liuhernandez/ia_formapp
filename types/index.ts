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
}

export interface User {
    id: number;
    username: string;
    nombre: string;
}

export interface SyncStats {
    total: number;
    synced: number;
    pending: number;
}
