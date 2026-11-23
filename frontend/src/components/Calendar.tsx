import { useState } from 'react';
import {
    Calendar as BigCalendar,
    dateFnsLocalizer,
    type ToolbarProps,
} from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { ReunionConGrupo } from '../services/meetings.service';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { es },
});

const MENSAJES_CALENDARIO = {
    showMore: (total: number) => `+${total} más`,
    noEventsInRange: 'No hay reuniones en este período.',
};

function CalendarToolbar({ label, onNavigate }: ToolbarProps<CalendarEvent>) {
    return (
        <div className="calendar-toolbar">
            <button type="button" className="toolbar-button" onClick={() => onNavigate('PREV')}>
                ‹ Anterior
            </button>
            <strong className="calendar-toolbar-label">{label}</strong>
            <button type="button" className="toolbar-button" onClick={() => onNavigate('NEXT')}>
                Siguiente ›
            </button>
        </div>
    );
}

type CalendarEvent = ReunionConGrupo & {
    title: string;
    start: Date;
    end: Date;
};

type CalendarProps = {
    reuniones: ReunionConGrupo[];
    onSeleccionar: (reunion: ReunionConGrupo) => void;
};

// Vista mensual de las reuniones. Al hacer clic en una se abre su detalle.
export function Calendar({ reuniones, onSeleccionar }: CalendarProps) {
    const [fechaActual, setFechaActual] = useState(new Date());

    const eventos: CalendarEvent[] = reuniones.map((reunion) => ({
        ...reunion,
        title: reunion.titulo,
        start: new Date(reunion.fecha_inicio),
        end: new Date(reunion.fecha_fin),
    }));

    return (
        <div className="calendar-frame">
            <BigCalendar
                localizer={localizer}
                events={eventos}
                startAccessor="start"
                endAccessor="end"
                culture="es"
                messages={MENSAJES_CALENDARIO}
                date={fechaActual}
                view="month"
                views={['month']}
                onView={() => undefined}
                components={{ toolbar: CalendarToolbar }}
                tooltipAccessor={(evento) => `${evento.titulo} · ${evento.grupo_nombre}`}
                onNavigate={(nuevaFecha) => setFechaActual(nuevaFecha)}
                onSelectEvent={(evento) => onSeleccionar(evento)}
                popup
                style={{ height: '100%' }}
            />
        </div>
    );
}
