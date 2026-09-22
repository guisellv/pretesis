import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { es },
});

type CalendarProps = {
    nombreGrupo?: string;
};

export function Calendar({ nombreGrupo }: CalendarProps) {
    return (
        <>
            <h1 className="calendar-title">
                {nombreGrupo ? `Calendario de ${nombreGrupo}` : 'Calendario de todas las actividades'}
            </h1>
            <BigCalendar
                localizer={localizer}
                events={[]}
                startAccessor="start"
                endAccessor="end"
                culture="es"
                toolbar={false}
                style={{ height: '100%' }}
            />
        </>
    );
}
