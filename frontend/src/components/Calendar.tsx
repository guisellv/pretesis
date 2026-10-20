import { useEffect, useState } from 'react';
import axios from 'axios';
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

function CalendarToolbar({ label, onNavigate }: ToolbarProps) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
            <button type="button" onClick={() => onNavigate('PREV')}>
                Anterior
            </button>
            <strong style={{ fontSize: '1rem', textAlign: 'center' }}>{label}</strong>
            <button type="button" onClick={() => onNavigate('NEXT')}>
                Siguiente
            </button>
        </div>
    );
}

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
    const [partesHora, setPartesHora] = useState({ hora: '', minuto: '' });
    const [error, setError] = useState('');
    const [errorCarga, setErrorCarga] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [fechaActual, setFechaActual] = useState(new Date());

    useEffect(() => {
        setErrorCarga('');

        if (grupoId === null || usuarioId === null) {
            setReuniones([]);
            return;
        }

        listarReuniones(grupoId, usuarioId)
            .then(setReuniones)
            .catch((errorDesconocido: unknown) => {
                setReuniones([]);
                const mensaje = axios.isAxiosError(errorDesconocido)
                    ? errorDesconocido.response?.data?.error
                    : null;
                setErrorCarga(mensaje || 'No se pudieron cargar las reuniones. Revisa la conexión y vuelve a intentarlo.');
                console.error('Error al cargar reuniones:', errorDesconocido);
            });
    }, [grupoId, usuarioId]);

    const abrirNuevaReunion = () => {
        setReunionEditada(null);
        setFormulario(formularioVacio);
        setPartesHora({ hora: '', minuto: '' });
        setError('');
        setModalAbierto(true);
    };

    const abrirEditarReunion = (reunion: Reunion) => {
        setReunionEditada(reunion);
        const fechaHora = fechaHoraParaFormulario(new Date(reunion.fecha_inicio));
        setFormulario({
            titulo: reunion.titulo,
            descripcion: reunion.descripcion,
            ...fechaHora,
        });
        setPartesHora({
            hora: fechaHora.hora.slice(0, 2),
            minuto: fechaHora.hora.slice(3, 5),
        });
        setError('');
        setModalAbierto(true);
    };

    const actualizarParteHora = (parte: 'hora' | 'minuto', valor: string) => {
        const valorLimpio = valor.replace(/\D/g, '').slice(0, 2);
        const nuevasPartes = { ...partesHora, [parte]: valorLimpio };
        setPartesHora(nuevasPartes);
        setFormulario((actual) => ({
            ...actual,
            hora: nuevasPartes.hora && nuevasPartes.minuto
                ? `${nuevasPartes.hora.padStart(2, '0')}:${nuevasPartes.minuto.padStart(2, '0')}`
                : '',
        }));
    };

    const ajustarParteHora = (parte: 'hora' | 'minuto', cambio: number) => {
        const limite = parte === 'hora' ? 24 : 60;
        const actual = Number(partesHora[parte] || 0);
        const siguiente = (actual + cambio + limite) % limite;
        actualizarParteHora(parte, String(siguiente).padStart(2, '0'));
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setReunionEditada(null);
        setFormulario(formularioVacio);
        setPartesHora({ hora: '', minuto: '' });
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
    const soloLectura = reunionEditada !== null && !esAdministrador;

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

            {errorCarga && <p className="form-error">{errorCarga}</p>}
            {!errorCarga && grupoId !== null && reuniones.length === 0 && (
                <p>No hay reuniones registradas en este grupo.</p>
            )}

            <BigCalendar
                localizer={localizer}
                events={eventos}
                startAccessor="start"
                endAccessor="end"
                culture="es"
                date={fechaActual}
                defaultView="month"
                views={['month', 'week', 'day', 'agenda']}
                toolbar={true}
                components={{ toolbar: CalendarToolbar }}
                onNavigate={(nuevaFecha) => setFechaActual(nuevaFecha)}
                onSelectEvent={(evento) => abrirEditarReunion(evento as CalendarEvent)}
                style={{ height: '100%' }}
            />

            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-box meeting-modal">
                        <h3>
                            {reunionEditada
                                ? soloLectura ? 'Información de reunión' : 'Editar reunión'
                                : 'Crear reunión'}
                        </h3>

                        <label>
                            Título
                            <input
                                type="text"
                                value={formulario.titulo}
                                disabled={soloLectura}
                                onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })}
                                placeholder="Ej: Reunión de coordinación"
                            />
                        </label>

                        <label>
                            Descripción
                            <textarea
                                value={formulario.descripcion}
                                disabled={soloLectura}
                                onChange={(evento) => setFormulario({ ...formulario, descripcion: evento.target.value })}
                                placeholder="Detalles de la reunión"
                                rows={3}
                            />
                        </label>

                        <div className="meeting-date-time">
                            <label>
                                Fecha
                                <input
                                    type="date"
                                    value={formulario.fecha}
                                    disabled={soloLectura}
                                    onChange={(evento) => setFormulario({ ...formulario, fecha: evento.target.value })}
                                />
                            </label>

                            <label>
                                Hora
                                <div className="time-picker">
                                    <div className="time-picker-unit">
                                        <button
                                            type="button"
                                            className="time-step-button"
                                            aria-label="Disminuir hora"
                                            disabled={soloLectura}
                                            onClick={() => ajustarParteHora('hora', -1)}
                                        >▼</button>
                                        <input
                                            className="time-value"
                                            type="number"
                                            min="0"
                                            max="23"
                                            value={partesHora.hora}
                                            disabled={soloLectura}
                                            placeholder="HH"
                                            onChange={(evento) => actualizarParteHora('hora', evento.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="time-step-button"
                                            aria-label="Aumentar hora"
                                            disabled={soloLectura}
                                            onClick={() => ajustarParteHora('hora', 1)}
                                        >▲</button>
                                    </div>
                                    <span aria-hidden="true">:</span>
                                    <div className="time-picker-unit">
                                        <button
                                            type="button"
                                            className="time-step-button"
                                            aria-label="Disminuir minutos"
                                            disabled={soloLectura}
                                            onClick={() => ajustarParteHora('minuto', -5)}
                                        >▼</button>
                                        <input
                                            className="time-value"
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={partesHora.minuto}
                                            disabled={soloLectura}
                                            placeholder="MM"
                                            onChange={(evento) => actualizarParteHora('minuto', evento.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="time-step-button"
                                            aria-label="Aumentar minutos"
                                            disabled={soloLectura}
                                            onClick={() => ajustarParteHora('minuto', 5)}
                                        >▲</button>
                                    </div>
                                </div>
                            </label>
                        </div>


                        {error && <p className="form-error">{error}</p>}

                        {!soloLectura && (
                            <button type="button" className="primary-button" onClick={guardarReunion} disabled={guardando}>
                                {guardando ? 'Guardando...' : 'Guardar reunión'}
                            </button>
                        )}

                        {reunionEditada && esAdministrador && (
                            <button type="button" className="danger-button" onClick={borrarReunion} disabled={guardando}>
                                Eliminar reunión
                            </button>
                        )}

                        <button type="button" className="secondary-button" onClick={cerrarModal}>
                            {soloLectura ? 'Cerrar' : 'Cancelar'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
