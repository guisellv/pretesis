const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

const pad = (valor: number) => String(valor).padStart(2, '0');

// Verifica que la fecha exista de verdad (rechaza "2026-02-30T10:00" o "2026-01-01T25:00")
export function esFechaValida(fecha: string): boolean {
    const coincidencia = fecha.match(FORMATO_FECHA);
    if (!coincidencia) return false;

    const [, anio, mes, dia, horas, minutos] = coincidencia.map(Number);
    const comprobacion = new Date(Date.UTC(anio, mes - 1, dia, horas, minutos));

    return (
        comprobacion.getUTCFullYear() === anio &&
        comprobacion.getUTCMonth() === mes - 1 &&
        comprobacion.getUTCDate() === dia &&
        comprobacion.getUTCHours() === horas &&
        comprobacion.getUTCMinutes() === minutos
    );
}

// Si no llega la hora de término, la reunión dura 1 hora. Ambas fechas en formato "YYYY-MM-DDTHH:MM".
export function calcularFechaFin(fechaInicio: string, fechaFin?: string): string {
    if (fechaFin) return fechaFin;

    const [, anio, mes, dia, horas, minutos] = fechaInicio.match(FORMATO_FECHA)!.map(Number);
    const fin = new Date(Date.UTC(anio, mes - 1, dia, horas + 1, minutos));

    return `${fin.getUTCFullYear()}-${pad(fin.getUTCMonth() + 1)}-${pad(fin.getUTCDate())}T${pad(fin.getUTCHours())}:${pad(fin.getUTCMinutes())}`;
}

// fecha_inicio llega en hora local (sin zona horaria)
export function esFechaPasada(fechaInicio: string): boolean {
    const coincidencia = fechaInicio.match(FORMATO_FECHA);
    if (!coincidencia) return false;

    const [, anio, mes, dia, horas, minutos] = coincidencia.map(Number);
    const inicio = new Date(anio, mes - 1, dia, horas, minutos);

    // Se compara contra el minuto actual para permitir crear una reunión "ahora mismo"
    const ahora = new Date();
    ahora.setSeconds(0, 0);

    return inicio.getTime() < ahora.getTime();
}
