import { useState } from 'react';
import { Calendar } from '../components/Calendar';
import { ConfirmModal } from '../components/Modal';
import type { ModoReunion } from '../components/ReunionModal';
import type { Grupo } from '../services/groups.service';
import { eliminarReunion, type ReunionConGrupo } from '../services/meetings.service';
import { esRolAdministrador, fechaHora, mensajeError } from '../helpers/formato';

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
    const [porEliminar, setPorEliminar] = useState<ReunionConGrupo | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [errorEliminar, setErrorEliminar] = useState('');

    const esAdmin = esRolAdministrador(grupoSeleccionado?.rol);
    const reunionesDelGrupo = grupoSeleccionado
        ? reuniones.filter((reunion) => reunion.grupo_id === grupoSeleccionado.id)
        : [];

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

            {errorCarga && <p className="form-error" role="alert">{errorCarga}</p>}

            {vista === 'calendario' ? (
                <Calendar
                    reuniones={reunionesDelGrupo}
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
                                <th className="col-actions">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reunionesDelGrupo.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="table-empty">
                                        {grupoSeleccionado.nombre} todavía no tiene reuniones registradas.
                                    </td>
                                </tr>
                            ) : reunionesDelGrupo.map((reunion, indice) => {
                                const lugar = reunion.modalidad === 'online' ? reunion.plataforma : reunion.direccion;

                                return (
                                    <tr key={reunion.id}>
                                        <td className="col-id">{indice + 1}</td>
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
