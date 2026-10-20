import type { Person } from '@/database/repositories/people.repository';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

export async function exportToExcel(persons: Person[], fileName?: string): Promise<void> {
    if (persons.length === 0) {
        throw new Error('No hay registros para exportar');
    }

    const data = persons.map((p, index) => ({
        '#': index + 1,
        'Nombre': p.name,
        'Apellido': p.last_name,
        'Cédula': p.dni,
        'Teléfono': p.phone,
        'Teléfono Opcional': p.phone_optional,
        'Email': p.email,
        'Dirección': p.address,
        'Punto de Referencia': p.address_reference,
        'Parroquia / Sector': p.parish,
        'Fecha de Nacimiento': p.birthday_date,
        'Género': p.gender === 'M' ? 'Hombre' : 'Mujer',
        'Comentarios': p.comments,
        'Día de Visita': p.visit_day,
        'Hora de Visita': p.visit_time,
        'Fecha de Registro': p.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        { wch: 4 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 },
        { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 12 },
        { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const date = new Date().toISOString().split('T')[0];
    const name = fileName || `ElimAPP_Registros_${date}`;
    const uri = `${FileSystem.cacheDirectory}/${name}.xlsx`;

    await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
        await Sharing.shareAsync(uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Exportar registros',
        });
    } else {
        throw new Error('La función de compartir no está disponible en este dispositivo');
    }
}