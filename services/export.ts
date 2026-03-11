import type { Persona } from '@/types';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

export async function exportToExcel(personas: Persona[], fileName?: string): Promise<void> {
    if (personas.length === 0) {
        throw new Error('No hay registros para exportar');
    }

    // Map data to readable columns
    const data = personas.map((p, index) => ({
        '#': index + 1,
        'Nombre': p.nombre,
        'Cédula': p.cedula,
        'Edad': p.edad,
        'Teléfono': p.telefono,
        'Teléfono Opcional': p.telefono_opcional,
        'Email': p.email,
        'Dirección': p.direccion,
        'Punto de Referencia': p.punto_referencia,
        'Sector / Barrio': p.sector_barrio,
        'Fecha de Nacimiento': p.fecha_nacimiento,
        'Género': p.genero === 'M' ? 'Hombre' : 'Mujer',
        'Estado': p.synced === 1 ? 'Sincronizado' : 'Pendiente',
        'Fecha de Registro': p.created_at,
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        { wch: 4 }, { wch: 25 }, { wch: 15 }, { wch: 6 }, { wch: 15 },
        { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 },
        { wch: 15 }, { wch: 10 }, { wch: 14 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    // Generate as base64
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Write to cache directory using new Expo File API
    const date = new Date().toISOString().split('T')[0];
    const name = fileName || `ElimAPP_Registros_${date}`;
    const file = new File(Paths.cache, `${name}.xlsx`);

    // Convert base64 to Uint8Array and write
    const binaryString = atob(wbout);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const writer = file.writableStream();
    const w = writer.getWriter();
    await w.write(bytes);
    await w.close();

    // Share the file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Exportar registros',
        });
    } else {
        throw new Error('La función de compartir no está disponible en este dispositivo');
    }
}
