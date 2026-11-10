import { useEffect, useRef, useState } from 'react';
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
    guardarFormularioActa,
    listarReuniones,
    obtenerFormularioActa,
    type CambioFormulario,
    type ChoqueReunion,
    type FormularioActa,
    type Modalidad,
    type Reunion,
} from '../services/meetings.service';
import { tituloValido } from '../helpers/titulo';

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
    esSecretaria?: boolean;
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
    modalidad: Modalidad | '';
    plataforma: string; // una de PLATAFORMAS o 'Otra'
    plataformaOtra: string; // nombre escrito a mano cuando plataforma es 'Otra'
    enlace: string;
    direccion: string;
};

const PLATAFORMAS = ['Google Meet', 'Zoom', 'Microsoft Teams'];

const formularioVacio: FormularioReunion = {
    titulo: '',
    descripcion: '',
    fecha: '',
    hora: '',
    modalidad: '',
    plataforma: '',
    plataformaOtra: '',
    enlace: '',
    direccion: '',
};

function modalidadParaFormulario(reunion: Reunion): Pick<
    FormularioReunion,
    'modalidad' | 'plataforma' | 'plataformaOtra' | 'enlace' | 'direccion'
> {
    const plataforma = reunion.plataforma ?? '';
    const esConocida = PLATAFORMAS.includes(plataforma);
    return {
        modalidad: reunion.modalidad ?? '',
        plataforma: !plataforma ? '' : esConocida ? plataforma : 'Otra',
        plataformaOtra: plataforma && !esConocida ? plataforma : '',
        enlace: reunion.enlace ?? '',
        direccion: reunion.direccion ?? '',
    };
}

function enlaceValido(enlace: string): boolean {
    try {
        const url = new URL(enlace);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

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
    esSecretaria,
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
    // Reuniones con las que choca el horario; si hay, se pide confirmar antes de guardar
    const [choques, setChoques] = useState<ChoqueReunion[]>([]);
    const [errorCarga, setErrorCarga] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [fechaActual, setFechaActual] = useState(new Date());
    const [acta, setActa] = useState<FormularioActa | null>(null);
    const [historialActa, setHistorialActa] = useState<CambioFormulario[]>([]);
    const [versionViendo, setVersionViendo] = useState<CambioFormulario | null>(null);
    const [vistaFormulario, setVistaFormulario] = useState(false);
    const [contenidoActa, setContenidoActa] = useState('');
    const [errorActa, setErrorActa] = useState('');
    const [guardandoActa, setGuardandoActa] = useState(false);
    const reunionAbiertaId = useRef<number | null>(null);

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
        setChoques([]);
        setModalAbierto(true);
    };

    const abrirEditarReunion = (reunion: Reunion) => {
        setReunionEditada(reunion);
        const fechaHora = fechaHoraParaFormulario(new Date(reunion.fecha_inicio));
        setFormulario({
            titulo: reunion.titulo,
            descripcion: reunion.descripcion,
            ...fechaHora,
            ...modalidadParaFormulario(reunion),
        });
        setPartesHora({
            hora: fechaHora.hora.slice(0, 2),
            minuto: fechaHora.hora.slice(3, 5),
        });
        setError('');
        setChoques([]);
        setModalAbierto(true);

        reunionAbiertaId.current = reunion.id;
        setActa(null);
        setHistorialActa([]);
        setVistaFormulario(false);
        setErrorActa('');

        obtenerFormularioActa(reunion.id)
            .then(({ formulario, historial }) => {
                // Evita mostrar el formulario de otra reunión si el usuario cambió rápido
                if (reunionAbiertaId.current !== reunion.id) return;
                setActa(formulario);
                setHistorialActa(historial);
            })
            .catch((errorDesconocido: unknown) => {
                console.error('Error al cargar formulario:', errorDesconocido);
            });
    };

    const abrirFormularioActa = () => {
        setContenidoActa(acta?.contenido ?? '');
        setErrorActa('');
        setVersionViendo(null);
        setVistaFormulario(true);
    };

    const restaurarVersion = (version: CambioFormulario) => {
        // Copia el texto antiguo al editor; se guarda recién al presionar "Guardar formulario"
        setContenidoActa(version.contenido);
        setVersionViendo(null);
        setErrorActa('');
    };

    const formatearFecha = (fecha: string) =>
        format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es });

    const guardarActa = async () => {
        if (!reunionEditada) return;

        if (!contenidoActa.trim()) {
            setErrorActa('Escribe lo que se habló en la reunión antes de guardar.');
            return;
        }

        setGuardandoActa(true);
        setErrorActa('');

        try {
            const { formulario, historial } = await guardarFormularioActa(reunionEditada.id, contenidoActa);
            setActa(formulario);
            setHistorialActa(historial);
            setVistaFormulario(false);
        } catch (errorDesconocido: unknown) {
            const mensaje = axios.isAxiosError(errorDesconocido)
                ? errorDesconocido.response?.data?.error
                : null;
            setErrorActa(mensaje || 'No se pudo guardar el formulario.');
        } finally {
            setGuardandoActa(false);
        }
    };

    const actualizarParteHora = (parte: 'hora' | 'minuto', valor: string) => {
        const valorLimpio = valor.replace(/\D/g, '').slice(0, 2);
        const nuevasPartes = { ...partesHora, [parte]: valorLimpio };
        setPartesHora(nuevasPartes);
        setChoques([]); // el aviso de choque era para el horario anterior
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
        setChoques([]);
        reunionAbiertaId.current = null;
        setActa(null);
        setHistorialActa([]);
        setVersionViendo(null);
        setVistaFormulario(false);
        setContenidoActa('');
        setErrorActa('');
    };

    const guardarReunion = async (confirmarChoque = false) => {
        if (grupoId === null || usuarioId === null) {
            setError('Selecciona un grupo antes de guardar la reunión.');
            return;
        }

        if (!formulario.titulo.trim() || !formulario.fecha || !formulario.hora) {
            setError('Completa el título y la fecha de la reunión.');
            return;
        }

        if (!tituloValido(formulario.titulo)) {
            setError('El título de la reunión debe tener al menos una letra, no puede ser solo números.');
            return;
        }

        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(formulario.hora)) {
            setError('Escribe la hora con el formato HH:MM, por ejemplo 14:30.');
            return;
        }

        // Al editar, una reunión que ya pasó se puede corregir mientras no se cambie su fecha u hora
        const fechaOriginal = reunionEditada
            ? fechaHoraParaFormulario(new Date(reunionEditada.fecha_inicio))
            : null;
        const cambioFecha = !fechaOriginal
            || fechaOriginal.fecha !== formulario.fecha
            || fechaOriginal.hora !== formulario.hora;
        const inicio = new Date(`${formulario.fecha}T${formulario.hora}`);
        const minutoActual = new Date();
        minutoActual.setSeconds(0, 0);

        if (cambioFecha && inicio.getTime() < minutoActual.getTime()) {
            setError(reunionEditada
                ? 'No puedes mover la reunión a una fecha u hora que ya pasó.'
                : 'No puedes crear una reunión en una fecha u hora que ya pasó.');
            return;
        }

        if (!formulario.modalidad) {
            setError('Selecciona si la reunión es online o presencial.');
            return;
        }

        const esOnline = formulario.modalidad === 'online';
        const plataforma = formulario.plataforma === 'Otra'
            ? formulario.plataformaOtra.trim()
            : formulario.plataforma;
        const enlace = formulario.enlace.trim();
        const direccion = formulario.direccion.trim();

        if (esOnline && (!plataforma || !enlace)) {
            setError('Indica la plataforma y el enlace de la reunión online.');
            return;
        }

        if (esOnline && !enlaceValido(enlace)) {
            setError('El enlace debe comenzar con http:// o https://');
            return;
        }

        if (!esOnline && !direccion) {
            setError('Indica la dirección de la reunión presencial.');
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
                modalidad: formulario.modalidad,
                plataforma: esOnline ? plataforma : null,
                enlace: esOnline ? enlace : null,
                direccion: esOnline ? null : direccion,
            };

            if (reunionEditada) {
                const actualizada = await actualizarReunion(
                    { ...datos, id: reunionEditada.id },
                    usuarioId,
                    { confirmarChoque }
                );
                setReuniones((actuales) => actuales.map((reunion) => (
                    reunion.id === actualizada.id ? actualizada : reunion
                )));
            } else {
                const creada = await crearReunion(datos, usuarioId, { confirmarChoque });
                setReuniones((actuales) => [...actuales, creada]);
            }

            cerrarModal();
        } catch (errorDesconocido: unknown) {
            const respuesta = axios.isAxiosError(errorDesconocido)
                ? errorDesconocido.response
                : undefined;

            if (respuesta?.status === 409 && Array.isArray(respuesta.data?.choques)) {
                setChoques(respuesta.data.choques);
                return;
            }

            setError(respuesta?.data?.error || 'No se pudo guardar la reunión.');
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
    // Administrador y secretaria crean/modifican el formulario; los integrantes solo lo leen
    const puedeEditarActa = Boolean(esAdministrador || esSecretaria);

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
                    {vistaFormulario && reunionEditada ? (
                    <div className="modal-box meeting-modal acta-modal">
                        <h3>Formulario de la reunión</h3>
                        <p className="acta-reunion-info">
                            <strong>{reunionEditada.titulo}</strong>
                            <br />
                            {formatearFecha(reunionEditada.fecha_inicio)}
                        </p>

                        {versionViendo ? (
                            <>
                                <p className="acta-version-aviso">
                                    Estás viendo una versión anterior: <strong>{versionViendo.usuario_nombre}</strong>{' '}
                                    {versionViendo.accion} el formulario el {formatearFecha(versionViendo.fecha)}
                                </p>

                                <label>
                                    Contenido de esa versión
                                    <textarea
                                        className="acta-textarea"
                                        value={versionViendo.contenido}
                                        rows={14}
                                        readOnly
                                    />
                                </label>

                                {puedeEditarActa && (
                                    <button type="button" className="primary-button" onClick={() => restaurarVersion(versionViendo)}>
                                        Restaurar esta versión
                                    </button>
                                )}

                                <button type="button" className="secondary-button" onClick={() => setVersionViendo(null)}>
                                    Volver al formulario actual
                                </button>
                            </>
                        ) : (
                            <>
                                <label>
                                    Lo que se habló en la reunión
                                    <textarea
                                        className="acta-textarea"
                                        value={contenidoActa}
                                        onChange={(evento) => setContenidoActa(evento.target.value)}
                                        placeholder="Asistentes, temas tratados, acuerdos, tareas pendientes..."
                                        rows={14}
                                        readOnly={!puedeEditarActa}
                                        autoFocus={puedeEditarActa}
                                    />
                                </label>

                                {errorActa && <p className="form-error">{errorActa}</p>}

                                {puedeEditarActa && (
                                    <button type="button" className="primary-button" onClick={guardarActa} disabled={guardandoActa}>
                                        {guardandoActa ? 'Guardando...' : 'Guardar formulario'}
                                    </button>
                                )}

                                <button type="button" className="secondary-button" onClick={() => setVistaFormulario(false)}>
                                    Volver
                                </button>
                            </>
                        )}

                        {historialActa.length > 0 && (
                            <section className="acta-historial">
                                <h4>Historial de cambios</h4>
                                <ul>
                                    {historialActa.map((cambio, indice) => (
                                        <li
                                            key={cambio.id}
                                            className={versionViendo?.id === cambio.id ? 'acta-historial-activo' : undefined}
                                        >
                                            <span>
                                                <strong>{cambio.usuario_nombre}</strong> {cambio.accion} el formulario
                                                {indice === 0 && <em className="acta-historial-actual"> (actual)</em>}
                                            </span>
                                            <span className="acta-historial-fecha">
                                                {formatearFecha(cambio.fecha)}
                                                <button
                                                    type="button"
                                                    className="acta-historial-ver"
                                                    onClick={() => setVersionViendo(cambio)}
                                                >
                                                    Ver
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                    ) : (
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
                                    min={reunionEditada ? undefined : fechaHoraParaFormulario(new Date()).fecha}
                                    disabled={soloLectura}
                                    onChange={(evento) => {
                                        setFormulario({ ...formulario, fecha: evento.target.value });
                                        setChoques([]); // el aviso de choque era para la fecha anterior
                                    }}
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

                        <fieldset className="meeting-modality" disabled={soloLectura}>
                            <legend>Modalidad</legend>
                            <div className="meeting-modality-options">
                                {(['presencial', 'online'] as const).map((opcion) => (
                                    <label
                                        key={opcion}
                                        className={`meeting-modality-option${formulario.modalidad === opcion ? ' is-selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="modalidad"
                                            value={opcion}
                                            checked={formulario.modalidad === opcion}
                                            onChange={() => setFormulario({ ...formulario, modalidad: opcion })}
                                        />
                                        {opcion === 'presencial' ? 'Presencial' : 'Online'}
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        {formulario.modalidad === 'online' && (
                            <>
                                <label>
                                    Plataforma
                                    <select
                                        value={formulario.plataforma}
                                        disabled={soloLectura}
                                        onChange={(evento) => setFormulario({ ...formulario, plataforma: evento.target.value })}
                                    >
                                        <option value="">Selecciona una plataforma</option>
                                        {PLATAFORMAS.map((nombre) => (
                                            <option key={nombre} value={nombre}>{nombre}</option>
                                        ))}
                                        <option value="Otra">Otra</option>
                                    </select>
                                </label>

                                {formulario.plataforma === 'Otra' && (
                                    <label>
                                        Nombre de la plataforma
                                        <input
                                            type="text"
                                            value={formulario.plataformaOtra}
                                            disabled={soloLectura}
                                            onChange={(evento) => setFormulario({ ...formulario, plataformaOtra: evento.target.value })}
                                            placeholder="Ej: Jitsi, Discord, Webex"
                                        />
                                    </label>
                                )}

                                <label>
                                    Enlace de la reunión
                                    {soloLectura && formulario.enlace ? (
                                        <a
                                            className="meeting-link"
                                            href={formulario.enlace}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {formulario.enlace}
                                        </a>
                                    ) : (
                                        <input
                                            type="url"
                                            value={formulario.enlace}
                                            disabled={soloLectura}
                                            onChange={(evento) => setFormulario({ ...formulario, enlace: evento.target.value })}
                                            placeholder="https://meet.google.com/abc-defg-hij"
                                        />
                                    )}
                                </label>
                            </>
                        )}

                        {formulario.modalidad === 'presencial' && (
                            <label>
                                Dirección
                                <input
                                    type="text"
                                    value={formulario.direccion}
                                    disabled={soloLectura}
                                    onChange={(evento) => setFormulario({ ...formulario, direccion: evento.target.value })}
                                    placeholder="Ej: Av. Principal 123, sala 4"
                                />
                            </label>
                        )}

                        {error && <p className="form-error">{error}</p>}

                        {!soloLectura && choques.length > 0 && (
                            <div className="meeting-conflict" role="alert">
                                <p>
                                    <strong>Este horario choca con {choques.length === 1 ? 'otra reunión' : 'otras reuniones'} del grupo:</strong>
                                </p>
                                <ul>
                                    {choques.map((choque) => (
                                        <li key={choque.id}>
                                            <strong>{choque.titulo}</strong>
                                            {' — '}
                                            {formatearFecha(choque.fecha_inicio)} a {format(new Date(choque.fecha_fin), 'HH:mm')}
                                        </li>
                                    ))}
                                </ul>
                                <p>Puedes cambiar la fecha u hora, o guardarla de todas formas.</p>
                            </div>
                        )}

                        {!soloLectura && (
                            choques.length > 0 ? (
                                <button type="button" className="primary-button" onClick={() => guardarReunion(true)} disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar de todas formas'}
                                </button>
                            ) : (
                                <button type="button" className="primary-button" onClick={() => guardarReunion()} disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar reunión'}
                                </button>
                            )
                        )}

                        {reunionEditada && puedeEditarActa && (
                            <button type="button" className="primary-button" onClick={abrirFormularioActa}>
                                {acta ? 'Editar formulario' : 'Crear formulario'}
                            </button>
                        )}

                        {reunionEditada && !puedeEditarActa && acta && (
                            <button type="button" className="primary-button" onClick={abrirFormularioActa}>
                                Ver formulario
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
                    )}
                </div>
            )}
        </>
    );
}
