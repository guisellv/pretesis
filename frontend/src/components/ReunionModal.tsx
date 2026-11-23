import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns/format';
import {
    actualizarReunion,
    crearReunion,
    eliminarReunion,
    guardarFormularioActa,
    obtenerFormularioActa,
    type CambioFormulario,
    type ChoqueReunion,
    type EstadoAsistencia,
    type FormularioActa,
    type Modalidad,
    type Reunion,
    type ReunionConGrupo,
} from '../services/meetings.service';
import type { Grupo } from '../services/groups.service';
import { tituloValido } from '../helpers/titulo';
import { esRolAdministrador, fechaLarga, mensajeError } from '../helpers/formato';
import { Modal } from './Modal';
import { AsistenciaReunion } from './AsistenciaReunion';

export type ModoReunion = 'ver' | 'editar' | 'crear';

type ReunionModalProps = {
    modo: ModoReunion;
    reunion: ReunionConGrupo | null; // null al crear
    grupoNueva: Grupo | null; // grupo donde se crea la reunión (solo al crear)
    usuarioId: number;
    onGuardada: (reunion: ReunionConGrupo) => void;
    onEliminada: (id: number) => void;
    onAsistenciaCambiada: (reunionId: number, estado: EstadoAsistencia, confirmados: number) => void;
    onCerrar: () => void;
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

function formularioDesdeReunion(reunion: Reunion): FormularioReunion {
    const plataforma = reunion.plataforma ?? '';
    const esConocida = PLATAFORMAS.includes(plataforma);
    return {
        titulo: reunion.titulo,
        descripcion: reunion.descripcion,
        ...fechaHoraParaFormulario(new Date(reunion.fecha_inicio)),
        modalidad: reunion.modalidad ?? '',
        plataforma: !plataforma ? '' : esConocida ? plataforma : 'Otra',
        plataformaOtra: plataforma && !esConocida ? plataforma : '',
        enlace: reunion.enlace ?? '',
        direccion: reunion.direccion ?? '',
    };
}

export function ReunionModal({
    modo,
    reunion,
    grupoNueva,
    usuarioId,
    onGuardada,
    onEliminada,
    onAsistenciaCambiada,
    onCerrar,
}: ReunionModalProps) {
    const [formulario, setFormulario] = useState<FormularioReunion>(() => (
        reunion ? formularioDesdeReunion(reunion) : formularioVacio
    ));
    const [partesHora, setPartesHora] = useState(() => ({
        hora: formulario.hora.slice(0, 2),
        minuto: formulario.hora.slice(3, 5),
    }));
    const grupoId = reunion?.grupo_id ?? grupoNueva?.id ?? null;
    const nombreGrupo = reunion?.grupo_nombre ?? grupoNueva?.nombre ?? '';
    const [error, setError] = useState('');
    // Reuniones con las que choca el horario; si hay, se pide confirmar antes de guardar
    const [choques, setChoques] = useState<ChoqueReunion[]>([]);
    const [guardando, setGuardando] = useState(false);
    const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

    const [acta, setActa] = useState<FormularioActa | null>(null);
    const [historialActa, setHistorialActa] = useState<CambioFormulario[]>([]);
    const [versionViendo, setVersionViendo] = useState<CambioFormulario | null>(null);
    const [vistaFormulario, setVistaFormulario] = useState(false);
    const [contenidoActa, setContenidoActa] = useState('');
    const [errorActa, setErrorActa] = useState('');
    const [guardandoActa, setGuardandoActa] = useState(false);
    const reunionAbiertaId = useRef<number | null>(reunion?.id ?? null);

    const esAdministrador = modo === 'crear' || esRolAdministrador(reunion?.rol);
    const esSecretaria = reunion?.rol?.toLowerCase() === 'secretaria';
    const soloLectura = modo === 'ver' || !esAdministrador;
    // Administrador y secretaria crean/modifican el formulario; los integrantes solo lo leen
    const puedeEditarActa = Boolean(reunion && (esRolAdministrador(reunion.rol) || esSecretaria));

    useEffect(() => {
        if (!reunion) return;

        reunionAbiertaId.current = reunion.id;
        obtenerFormularioActa(reunion.id)
            .then(({ formulario: actaGuardada, historial }) => {
                // Evita mostrar el formulario de otra reunión si el usuario cambió rápido
                if (reunionAbiertaId.current !== reunion.id) return;
                setActa(actaGuardada);
                setHistorialActa(historial);
            })
            .catch((errorDesconocido: unknown) => {
                console.error('Error al cargar formulario:', errorDesconocido);
            });

        return () => {
            reunionAbiertaId.current = null;
        };
    }, [reunion]);

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

    const guardarActa = async () => {
        if (!reunion) return;

        if (!contenidoActa.trim()) {
            setErrorActa('Escribe lo que se habló en la reunión antes de guardar.');
            return;
        }

        setGuardandoActa(true);
        setErrorActa('');

        try {
            const { formulario: actaGuardada, historial } = await guardarFormularioActa(reunion.id, contenidoActa);
            setActa(actaGuardada);
            setHistorialActa(historial);
            setVistaFormulario(false);
        } catch (errorDesconocido: unknown) {
            setErrorActa(mensajeError(errorDesconocido, 'No se pudo guardar el formulario.'));
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

    const guardarReunion = async (confirmarChoque = false) => {
        if (grupoId === null) {
            setError('No se pudo identificar el grupo de la reunión.');
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
        const fechaOriginal = reunion ? fechaHoraParaFormulario(new Date(reunion.fecha_inicio)) : null;
        const cambioFecha = !fechaOriginal
            || fechaOriginal.fecha !== formulario.fecha
            || fechaOriginal.hora !== formulario.hora;
        const inicio = new Date(`${formulario.fecha}T${formulario.hora}`);
        const minutoActual = new Date();
        minutoActual.setSeconds(0, 0);

        if (cambioFecha && inicio.getTime() < minutoActual.getTime()) {
            setError(reunion
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

            const guardada = reunion
                ? await actualizarReunion({ ...datos, id: reunion.id }, usuarioId, { confirmarChoque })
                : await crearReunion(datos, usuarioId, { confirmarChoque });

            onGuardada({
                ...guardada,
                grupo_nombre: nombreGrupo,
                rol: reunion?.rol ?? grupoNueva?.rol ?? 'Administrador',
                mi_asistencia: reunion?.mi_asistencia ?? null,
                confirmados: reunion?.confirmados ?? 0,
            });
        } catch (errorDesconocido: unknown) {
            const respuesta = axios.isAxiosError(errorDesconocido) ? errorDesconocido.response : undefined;

            if (respuesta?.status === 409 && Array.isArray(respuesta.data?.choques)) {
                setChoques(respuesta.data.choques);
                return;
            }

            setError(mensajeError(errorDesconocido, 'No se pudo guardar la reunión.'));
        } finally {
            setGuardando(false);
        }
    };

    const borrarReunion = async () => {
        if (!reunion) return;

        setGuardando(true);
        try {
            await eliminarReunion(reunion.id, usuarioId);
            onEliminada(reunion.id);
        } catch (errorDesconocido: unknown) {
            setError(mensajeError(errorDesconocido, 'No se pudo eliminar la reunión.'));
            setConfirmandoEliminar(false);
        } finally {
            setGuardando(false);
        }
    };

    // ---------- Vista del formulario (acta) de la reunión ----------
    if (vistaFormulario && reunion) {
        return (
            <Modal
                ancho="ancho"
                titulo="Formulario de la reunión"
                subtitulo={<><strong>{reunion.titulo}</strong> · {fechaLarga(reunion.fecha_inicio)}</>}
                onCerrar={onCerrar}
                acciones={versionViendo ? (
                    <>
                        <button type="button" className="secondary-button" onClick={() => setVersionViendo(null)}>
                            Volver al formulario actual
                        </button>
                        {puedeEditarActa && (
                            <button type="button" className="primary-button" onClick={() => restaurarVersion(versionViendo)}>
                                Restaurar esta versión
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button type="button" className="secondary-button" onClick={() => setVistaFormulario(false)}>
                            Volver
                        </button>
                        {puedeEditarActa && (
                            <button type="button" className="primary-button" onClick={guardarActa} disabled={guardandoActa}>
                                {guardandoActa ? 'Guardando...' : 'Guardar formulario'}
                            </button>
                        )}
                    </>
                )}
            >
                {versionViendo ? (
                    <>
                        <p className="acta-version-aviso">
                            Estás viendo una versión anterior: <strong>{versionViendo.usuario_nombre}</strong>{' '}
                            {versionViendo.accion} el formulario el {fechaLarga(versionViendo.fecha)}
                        </p>

                        <label>
                            Contenido de esa versión
                            <textarea className="acta-textarea" value={versionViendo.contenido} rows={14} readOnly />
                        </label>
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
                                        {fechaLarga(cambio.fecha)}
                                        <button type="button" className="acta-historial-ver" onClick={() => setVersionViendo(cambio)}>
                                            Ver
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </Modal>
        );
    }

    // ---------- Datos de la reunión ----------
    const titulo = modo === 'crear'
        ? 'Crear reunión'
        : soloLectura ? 'Detalle de la reunión' : 'Modificar reunión';

    const acciones = confirmandoEliminar ? (
        <>
            <span className="modal-actions-text">¿Eliminar esta reunión? No se puede deshacer.</span>
            <button type="button" className="secondary-button" onClick={() => setConfirmandoEliminar(false)}>
                No
            </button>
            <button type="button" className="danger-solid-button" onClick={borrarReunion} disabled={guardando}>
                {guardando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
        </>
    ) : (
        <>
            {reunion && esAdministrador && modo === 'editar' && (
                <button type="button" className="danger-button" onClick={() => setConfirmandoEliminar(true)}>
                    Eliminar
                </button>
            )}

            <button type="button" className="secondary-button" onClick={onCerrar}>
                {soloLectura ? 'Cerrar' : 'Cancelar'}
            </button>

            {!soloLectura && (
                <button
                    type="button"
                    className="primary-button"
                    onClick={() => guardarReunion(choques.length > 0)}
                    disabled={guardando}
                >
                    {guardando ? 'Guardando...' : choques.length > 0 ? 'Guardar de todas formas' : 'Guardar reunión'}
                </button>
            )}
        </>
    );

    return (
        <Modal
            ancho="medio"
            titulo={titulo}
            subtitulo={nombreGrupo ? `Grupo: ${nombreGrupo}` : undefined}
            onCerrar={onCerrar}
            acciones={acciones}
        >
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
                        min={reunion ? undefined : fechaHoraParaFormulario(new Date()).fecha}
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
                        {(['hora', 'minuto'] as const).map((parte, indice) => (
                            <div className="time-picker-group" key={parte}>
                                {indice === 1 && <span aria-hidden="true">:</span>}
                                <div className="time-picker-unit">
                                    <button
                                        type="button"
                                        className="time-step-button"
                                        aria-label={parte === 'hora' ? 'Disminuir hora' : 'Disminuir minutos'}
                                        disabled={soloLectura}
                                        onClick={() => ajustarParteHora(parte, parte === 'hora' ? -1 : -5)}
                                    >▼</button>
                                    <input
                                        className="time-value"
                                        type="number"
                                        min="0"
                                        max={parte === 'hora' ? '23' : '59'}
                                        value={partesHora[parte]}
                                        disabled={soloLectura}
                                        placeholder={parte === 'hora' ? 'HH' : 'MM'}
                                        onChange={(evento) => actualizarParteHora(parte, evento.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="time-step-button"
                                        aria-label={parte === 'hora' ? 'Aumentar hora' : 'Aumentar minutos'}
                                        disabled={soloLectura}
                                        onClick={() => ajustarParteHora(parte, parte === 'hora' ? 1 : 5)}
                                    >▲</button>
                                </div>
                            </div>
                        ))}
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
                            <a className="meeting-link" href={formulario.enlace} target="_blank" rel="noopener noreferrer">
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
                                {fechaLarga(choque.fecha_inicio)} a {format(new Date(choque.fecha_fin), 'HH:mm')}
                            </li>
                        ))}
                    </ul>
                    <p>Puedes cambiar la fecha u hora, o guardarla de todas formas.</p>
                </div>
            )}

            {reunion && (
                <AsistenciaReunion
                    reunion={reunion}
                    onCambio={(estado, confirmados) => onAsistenciaCambiada(reunion.id, estado, confirmados)}
                />
            )}

            {reunion && (puedeEditarActa || acta) && (
                <div className="acta-card">
                    <div>
                        <strong>Formulario de la reunión</strong>
                        <p>{acta ? 'Ya tiene lo que se habló en la reunión.' : 'Aún no se ha registrado.'}</p>
                    </div>
                    <button type="button" className="outline-button" onClick={abrirFormularioActa}>
                        {!puedeEditarActa ? 'Ver formulario' : acta ? 'Editar formulario' : 'Crear formulario'}
                    </button>
                </div>
            )}
        </Modal>
    );
}
