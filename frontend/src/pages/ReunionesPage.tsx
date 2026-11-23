import { useState } from 'react';
import { Calendar } from '../components/Calendar';
import { ConfirmModal } from '../components/Modal';
import { FiltroSelect, FiltrosTabla } from '../components/FiltrosTabla';
import type { ModoReunion } from '../components/ReunionModal';
import type { Grupo } from '../services/groups.service';
import { eliminarReunion, type ReunionConGrupo } from '../services/meetings.service';
import { coincideBusqueda, esRolAdministrador, fechaHora, mensajeError } from '../helpers/formato';

type ReunionesPageProps = {
    grupos: Grupo[];
    grupoSeleccionado: Grupo | null;
    onSeleccionarGrupo: (grupoId: number) => void;
    reuniones: ReunionConGrupo[]; // de todos los grupos; aquí se filtran por el grupo elegido
    errorCarga: string;
    usuarioId: number;
    onIrAGrupos: () => void;
    onCrear: (grupo: Grupo) => void;
    onAbrir: (reunion: ReunionConGrupo, modo: ModoReunion) => void;
    onEliminada: (id: number) => void;
};

type FiltroModalidad = 'todas' | 'presencial' | 'online';
type FiltroPeriodo = 'todas' | 'proximas' | 'pasadas';
type FiltroAsistencia = 'todas' | 'asistire' | 'no_asistire' | 'pendiente';

const filtrosIniciales = {
    busqueda: '',
    modalidad: 'todas' as FiltroModalidad,
    periodo: 'todas' as FiltroPeriodo,
    asistencia: 'todas' as FiltroAsistencia,
};

const TEXTO_MI_ASISTENCIA = {
    asistire: 'Asistirás',
    no_asistire: 'No asistirás',
    pendiente: 'Sin responder',
} as const;

export default function ReunionesPage({
    grupos,
    grupoSeleccionado,
    onSeleccionarGrupo,
    reuniones,
    errorCarga,
    usuarioId,
    onIrAGrupos,
    onCrear,
    onAbrir,
    onEliminada,
}: ReunionesPageProps) {
    const [vista, setVista] = useState<'tabla' | 'calendario'>('tabla');
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const [porEliminar, setPorEliminar] = useState<ReunionConGrupo | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [errorEliminar, setErrorEliminar] = useState('');

    const esAdmin = esRolAdministrador(grupoSeleccionado?.rol);
    const ahora = Date.now();

    // El número (#) se asigna antes de filtrar, así una reunión mantiene su número al buscar
    const reunionesDelGrupo = grupoSeleccionado
        ? reuniones
            .filter((reunion) => reunion.grupo_id === grupoSeleccionado.id)
            .map((reunion, indice) => ({ reunion, numero: indice + 1 }))
        : [];

    const filtradas = reunionesDelGrupo.filter(({ reunion }) => {
        const yaPaso = new Date(reunion.fecha_inicio).getTime() < ahora;

        return coincideBusqueda(filtros.busqueda, reunion.titulo, reunion.descripcion, reunion.direccion, reunion.plataforma)
            && (filtros.modalidad === 'todas' || reunion.modalidad === filtros.modalidad)
            && (filtros.periodo === 'todas' || (filtros.periodo === 'pasadas') === yaPaso)
            && (filtros.asistencia === 'todas' || (reunion.mi_asistencia ?? 'pendiente') === filtros.asistencia);
    });

    const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(filtrosIniciales);
    const cambiarFiltro = <K extends keyof typeof filtros>(campo: K, valor: (typeof filtros)[K]) => (
        setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
    );

    const confirmarEliminar = async () => {
        if (!porEliminar) return;

        setEliminando(true);
        setErrorEliminar('');

        try {
            await eliminarReunion(porEliminar.id, usuarioId);
            onEliminada(porEliminar.id);
            setPorEliminar(null);
        } catch (errorDesconocido: unknown) {
            setErrorEliminar(mensajeError(errorDesconocido, 'No se pudo eliminar la reunión.'));
        } finally {
            setEliminando(false);
        }
    };

    if (!grupoSeleccionado) {
        return (
            <section className="page-card">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">Reuniones</h1>
                        <p className="page-subtitle">Las reuniones se organizan por grupo.</p>
                    </div>
                </header>
                <div className="empty-state">
                    <p>Todavía no perteneces a ningún grupo. Crea uno o únete con un código para ver y crear reuniones.</p>
                    <button type="button" className="primary-button" onClick={onIrAGrupos}>Ir a Grupos</button>
                </div>
            </section>
        );
    }

    return (
        <section className="page-card">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Reuniones</h1>
                    <p className="page-subtitle">Reuniones del grupo seleccionado.</p>
                </div>
                <div className="page-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setVista(vista === 'tabla' ? 'calendario' : 'tabla')}
                    >
                        {vista === 'tabla' ? 'Ver calendario' : 'Ver tabla'}
                    </button>
                    {esAdmin && (
                        <button type="button" className="primary-button" onClick={() => onCrear(grupoSeleccionado)}>
                            + Crear reunión
                        </button>
                    )}
                </div>
            </header>

            <div className="group-filter">
                <label htmlFor="filtro-grupo">Grupo</label>
                <select
                    id="filtro-grupo"
                    value={grupoSeleccionado.id}
                    onChange={(evento) => onSeleccionarGrupo(Number(evento.target.value))}
                >
                    {grupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
                    ))}
                </select>
                <span className="group-filter-info">
                    Tu rol: <span className={`role-badge${esAdmin ? ' is-admin' : ''}`}>{grupoSeleccionado.rol}</span>
                </span>
            </div>

            <FiltrosTabla
                busqueda={filtros.busqueda}
                onBusqueda={(valor) => cambiarFiltro('busqueda', valor)}
                placeholder="Buscar por título, descripción o lugar"
                total={reunionesDelGrupo.length}
                visibles={filtradas.length}
                hayFiltros={hayFiltros}
                onLimpiar={() => setFiltros(filtrosIniciales)}
            >
                <FiltroSelect
                    etiqueta="Fecha"
                    valor={filtros.periodo}
                    onCambiar={(valor) => cambiarFiltro('periodo', valor)}
                    opciones={[
                        { valor: 'todas', texto: 'Todas' },
                        { valor: 'proximas', texto: 'Próximas' },
                        { valor: 'pasadas', texto: 'Pasadas' },
                    ]}
                />
                <FiltroSelect
                    etiqueta="Modalidad"
                    valor={filtros.modalidad}
                    onCambiar={(valor) => cambiarFiltro('modalidad', valor)}
                    opciones={[
                        { valor: 'todas', texto: 'Todas' },
                        { valor: 'presencial', texto: 'Presencial' },
                        { valor: 'online', texto: 'Online' },
                    ]}
                />
                <FiltroSelect
                    etiqueta="Mi asistencia"
                    valor={filtros.asistencia}
                    onCambiar={(valor) => cambiarFiltro('asistencia', valor)}
                    opciones={[
                        { valor: 'todas', texto: 'Todas' },
                        { valor: 'asistire', texto: 'Asistiré' },
                        { valor: 'no_asistire', texto: 'No asistiré' },
                        { valor: 'pendiente', texto: 'Sin responder' },
                    ]}
                />
            </FiltrosTabla>

            {errorCarga && <p className="form-error" role="alert">{errorCarga}</p>}

            {vista === 'calendario' ? (
                <Calendar
                    reuniones={filtradas.map(({ reunion }) => reunion)}
                    onSeleccionar={(reunion) => onAbrir(reunion, esAdmin ? 'editar' : 'ver')}
                />
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="col-id">#</th>
                                <th>Título</th>
                                <th>Descripción</th>
                                <th>Fecha</th>
                                <th>Modalidad</th>
                                <th>Dirección / plataforma</th>
                                <th>Asistencia</th>
                                <th className="col-actions">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtradas.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="table-empty">
                                        {reunionesDelGrupo.length === 0
                                            ? `${grupoSeleccionado.nombre} todavía no tiene reuniones registradas.`
                                            : 'Ninguna reunión coincide con los filtros.'}
                                    </td>
                                </tr>
                            ) : filtradas.map(({ reunion, numero }) => {
                                const lugar = reunion.modalidad === 'online' ? reunion.plataforma : reunion.direccion;
                                const miAsistencia = reunion.mi_asistencia ?? 'pendiente';

                                return (
                                    <tr key={reunion.id}>
                                        <td className="col-id">{numero}</td>
                                        <td className="cell-strong">{reunion.titulo}</td>
                                        <td>
                                            {reunion.descripcion ? (
                                                <span className="cell-truncate" title={reunion.descripcion}>
                                                    {reunion.descripcion}
                                                </span>
                                            ) : <span className="cell-muted">—</span>}
                                        </td>
                                        <td className="cell-nowrap">{fechaHora(reunion.fecha_inicio)}</td>
                                        <td>
                                            <span className={`modality-badge is-${reunion.modalidad}`}>
                                                {reunion.modalidad === 'online' ? 'Online' : 'Presencial'}
                                            </span>
                                        </td>
                                        <td>
                                            {lugar ? (
                                                <span className="cell-truncate" title={lugar}>{lugar}</span>
                                            ) : <span className="cell-muted">—</span>}
                                        </td>
                                        <td>
                                            <div className="attendance-cell">
                                                <span className="cell-nowrap" title="Integrantes que confirmaron que asistirán">
                                                    {reunion.confirmados} {reunion.confirmados === 1 ? 'asistirá' : 'asistirán'}
                                                </span>
                                                <span className={`attendance-badge is-${miAsistencia}`}>
                                                    {TEXTO_MI_ASISTENCIA[miAsistencia]}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="col-actions">
                                            <div className="row-actions">
                                                <button type="button" className="link-button" onClick={() => onAbrir(reunion, 'ver')}>
                                                    Ver
                                                </button>
                                                {esAdmin && (
                                                    <>
                                                        <button type="button" className="link-button" onClick={() => onAbrir(reunion, 'editar')}>
                                                            Modificar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="link-button is-danger"
                                                            onClick={() => {
                                                                setErrorEliminar('');
                                                                setPorEliminar(reunion);
                                                            }}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {porEliminar && (
                <ConfirmModal
                    titulo="Eliminar reunión"
                    mensaje={(
                        <p>
                            ¿Seguro que quieres eliminar <strong>{porEliminar.titulo}</strong> ({fechaHora(porEliminar.fecha_inicio)})?
                            Esta acción no se puede deshacer.
                        </p>
                    )}
                    textoConfirmar="Eliminar reunión"
                    procesando={eliminando}
                    error={errorEliminar}
                    onConfirmar={confirmarEliminar}
                    onCerrar={() => setPorEliminar(null)}
                />
            )}
        </section>
    );
}
