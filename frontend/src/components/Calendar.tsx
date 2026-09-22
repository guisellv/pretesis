import { useEffect, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    actualizarReunion,
    crearReunion,
    eliminarReunion,
    listarReuniones,
    type Reunion,
} from '../services/meetings.service';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { es },
});

type CalendarProps = {
    nombreGrupo?: string;
    codigoGrupo?: string;
    esAdministrador?: boolean;
    grupoId: number | null;
    usuarioId: number | null;
};

type CalendarEvent = Reunion & {
    title: string;
    start: Date;
    end: Date;
};

type FormularioReunion = {
    titulo: string;
    descripcion: string;
    fecha: string;
    hora: string;
};

const formularioVacio: FormularioReunion = {
    titulo: '',
    descripcion: '',
    fecha: '',
    hora: '',
};

function fechaHoraParaFormulario(fecha: Date): Pick<FormularioReunion, 'fecha' | 'hora'> {
    const pad = (valor: number) => String(valor).padStart(2, '0');
    return {
        fecha: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`,
        hora: `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`,
    };
}

export function Calendar({
    nombreGrupo,
    codigoGrupo,
    esAdministrador,
    grupoId,
    usuarioId,
}: CalendarProps) {
    const mostrarCodigo = Boolean(nombreGrupo && codigoGrupo && esAdministrador);
    const [reuniones, setReuniones] = useState<Reunion[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [reunionEditada, setReunionEditada] = useState<Reunion | null>(null);
    const [formulario, setFormulario] = useState<FormularioReunion>(formularioVacio);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (grupoId === null || usuarioId === null) {
            setReuniones([]);
            return;
        }

        listarReuniones(grupoId, usuarioId)
            .then(setReuniones)
            .catch(() => setReuniones([]));
    }, [grupoId, usuarioId]);

    const abrirNuevaReunion = () => {
        setReunionEditada(null);
        setFormulario(formularioVacio);
        setError('');
        setModalAbierto(true);
    };

    const abrirEditarReunion = (reunion: Reunion) => {
        setReunionEditada(reunion);
        setFormulario({
            titulo: reunion.titulo,
            descripcion: reunion.descripcion,
            ...fechaHoraParaFormulario(new Date(reunion.fecha_inicio)),
        });
        setError('');
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setReunionEditada(null);
        setFormulario(formularioVacio);
        setError('');
    };

    const guardarReunion = async () => {
        if (grupoId === null || usuarioId === null) {
            setError('Selecciona un grupo antes de guardar la reunión.');
            return;
        }

        if (!formulario.titulo.trim() || !formulario.fecha || !formulario.hora) {
            setError('Completa el título y la fecha de la reunión.');
            return;
        }

        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(formulario.hora)) {
            setError('Escribe la hora con el formato HH:MM, por ejemplo 14:30.');
            return;
        }

        setGuardando(true);
        setError('');

        try {
            const datos = {
                grupo_id: grupoId,
                titulo: formulario.titulo,
                descripcion: formulario.descripcion,
                fecha_inicio: `${formulario.fecha}T${formulario.hora}`,
                fecha_fin: '',
            };

            if (reunionEditada) {
                const actualizada = await actualizarReunion(
                    { ...datos, id: reunionEditada.id },
                    usuarioId
                );
                setReuniones((actuales) => actuales.map((reunion) => (
                    reunion.id === actualizada.id ? actualizada : reunion
                )));
            } else {
                const creada = await crearReunion(datos, usuarioId);
                setReuniones((actuales) => [...actuales, creada]);
            }

            cerrarModal();
        } catch {
            setError('No se pudo guardar la reunión.');
        } finally {
            setGuardando(false);
        }
    };

    const borrarReunion = async () => {
        if (!reunionEditada || usuarioId === null) return;

        setGuardando(true);
        try {
            await eliminarReunion(reunionEditada.id, usuarioId);
            setReuniones((actuales) => actuales.filter((reunion) => reunion.id !== reunionEditada.id));
            cerrarModal();
        } catch {
            setError('No se pudo eliminar la reunión.');
        } finally {
            setGuardando(false);
        }
    };

    const eventos: CalendarEvent[] = reuniones.map((reunion) => ({
        ...reunion,
        title: reunion.titulo,
        start: new Date(reunion.fecha_inicio),
        end: new Date(reunion.fecha_fin),
    }));

    return (
        <>
            <div className="calendar-header">
                <h1 className="calendar-title">
                    {nombreGrupo ? `Calendario de ${nombreGrupo}` : 'Calendario de todas las actividades'}
                </h1>

                {mostrarCodigo && (
                    <div className="calendar-header-actions">
                        <p className="group-code-panel">Código del grupo: {codigoGrupo}</p>
                        <button
                            type="button"
                            className="create-meeting-button"
                            onClick={abrirNuevaReunion}
                        >
                            Crear reunión
                        </button>
                    </div>
                )}
            </div>

            <BigCalendar
                localizer={localizer}
                events={eventos}
                startAccessor="start"
                endAccessor="end"
                culture="es"
                toolbar={false}
                onSelectEvent={(evento) => {
                    if (esAdministrador) abrirEditarReunion(evento as CalendarEvent);
                }}
                style={{ height: '100%' }}
            />

            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-box meeting-modal">
                        <h3>{reunionEditada ? 'Editar reunión' : 'Crear reunión'}</h3>

                        <label>
                            Título
                            <input
                                type="text"
                                value={formulario.titulo}
                                onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })}
                                placeholder="Ej: Reunión de coordinación"
                            />
                        </label>

                        <label>
                            Descripción
                            <textarea
                                value={formulario.descripcion}
                                onChange={(evento) => setFormulario({ ...formulario, descripcion: evento.target.value })}
                                placeholder="Detalles de la reunión"
                                rows={3}
                            />
                        </label>

                        <label>
                            Fecha
                            <input
                                type="date"
                                value={formulario.fecha}
                                onChange={(evento) => setFormulario({ ...formulario, fecha: evento.target.value })}
                            />
                        </label>

                        <label>
                            Hora
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={formulario.hora}
                                onChange={(evento) => setFormulario({ ...formulario, hora: evento.target.value })}
                                placeholder="14:30"
                            />
                        </label>


                        {error && <p className="form-error">{error}</p>}

                        <button type="button" className="primary-button" onClick={guardarReunion} disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar reunión'}
                        </button>

                        {reunionEditada && (
                            <button type="button" className="danger-button" onClick={borrarReunion} disabled={guardando}>
                                Eliminar reunión
                            </button>
                        )}

                        <button type="button" className="secondary-button" onClick={cerrarModal}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
