import axios from 'axios';
import { format } from 'date-fns/format';
import { es } from 'date-fns/locale';

// 21/11/2026
export function fechaCorta(fecha: string): string {
    return format(new Date(fecha), 'dd/MM/yyyy');
}

// 21/11/2026; 14:30 hrs.
export function fechaHora(fecha: string): string {
    return format(new Date(fecha), "dd/MM/yyyy; HH:mm 'hrs.'");
}

// 21 de noviembre 2026, 14:30
export function fechaLarga(fecha: string): string {
    return format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es });
}

// Mensaje de error que manda el backend ({ error: '...' }) o uno por defecto
export function mensajeError(error: unknown, porDefecto: string): string {
    const mensaje = axios.isAxiosError(error) ? error.response?.data?.error : null;
    return typeof mensaje === 'string' && mensaje ? mensaje : porDefecto;
}

export function esRolAdministrador(rol: string | undefined): boolean {
    return rol?.toLowerCase() === 'administrador';
}

// Para buscar sin importar mayúsculas ni tildes: "Reunión" coincide con "reunion"
export function normalizar(texto: string | null | undefined): string {
    return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function coincideBusqueda(busqueda: string, ...campos: (string | null | undefined)[]): boolean {
    const termino = normalizar(busqueda);
    return !termino || campos.some((campo) => normalizar(campo).includes(termino));
}
