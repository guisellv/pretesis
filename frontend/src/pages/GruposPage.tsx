import { useEffect, useState } from 'react';
import {
    actualizarGrupo,
    actualizarRolIntegrante,
    crearGrupo,
    eliminarGrupo,
    listarIntegrantes,
    unirseGrupo,
    type Grupo,
    type Integrante,
    type RolIntegrante,
} from '../services/groups.service';
import { tituloValido } from '../helpers/titulo';
import { esRolAdministrador, fechaCorta, fechaHora, mensajeError } from '../helpers/formato';
import { ConfirmModal, Modal } from '../components/Modal';

type GruposPageProps = {
    grupos: Grupo[];
    usuarioId: number | null;
    onAgregado: (grupo: Grupo) => void;
    onActualizado: (grupo: Grupo) => void;
    onEliminado: (grupoId: number) => void;
};

type Dialogo =
    | { tipo: 'crear' }
    | { tipo: 'unirse' }
    | { tipo: 'ver'; grupo: Grupo }
    | { tipo: 'modificar'; grupo: Grupo }
    | { tipo: 'eliminar'; grupo: Grupo };

export default function GruposPage({ grupos, usuarioId, onAgregado, onActualizado, onEliminado }: GruposPageProps) {
    const [dialogo, setDialogo] = useState<Dialogo | null>(null);
    const [texto, setTexto] = useState(''); // nombre del grupo o código, según el diálogo
    const [error, setError] = useState('');
    const [procesando, setProcesando] = useState(false);

    const abrir = (nuevo: Dialogo) => {
        setDialogo(nuevo);
        setTexto(nuevo.tipo === 'modificar' ? nuevo.grupo.nombre : '');
        setError('');
    };

    const cerrar = () => {
        setDialogo(null);
        setTexto('');
        setError('');
    };

    const validarNombre = () => {
        if (!texto.trim()) {
            setError('Escribe un nombre para el grupo.');
            return false;
        }

        if (!tituloValido(texto)) {
            setError('El nombre del grupo debe tener al menos una letra, no puede ser solo números.');
            return false;
        }

        return true;
    };

    const ejecutar = async (accion: () => Promise<void>, mensajePorDefecto: string) => {
        setProcesando(true);
        setError('');

        try {
            await accion();
            cerrar();
        } catch (errorDesconocido: unknown) {
            setError(mensajeError(errorDesconocido, mensajePorDefecto));
        } finally {
            setProcesando(false);
        }
    };

    const guardarNuevo = () => {
        if (!validarNombre()) return;
        ejecutar(async () => onAgregado(await crearGrupo(texto.trim())), 'No se pudo crear el grupo. Inténtalo nuevamente.');
    };

    const guardarCambios = (grupo: Grupo) => {
        if (!validarNombre()) return;
        ejecutar(async () => onActualizado(await actualizarGrupo(grupo.id, texto.trim())), 'No se pudo modificar el grupo.');
    };

    const unirse = () => {
        if (!texto.trim()) {
            setError('Escribe el código.');
            return;
        }

        if (usuarioId === null) {
            setError('No se pudo identificar al usuario.');
            return;
        }

        ejecutar(async () => onAgregado(await unirseGrupo(usuarioId, texto)), 'El código no es válido o ya perteneces a este grupo.');
    };

    const eliminar = (grupo: Grupo) => {
        ejecutar(async () => {
            await eliminarGrupo(grupo.id);
            onEliminado(grupo.id);
        }, 'No se pudo eliminar el grupo.');
    };

    return (
        <section className="page-card">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Grupos</h1>
                    <p className="page-subtitle">Los grupos a los que perteneces.</p>
                </div>
                <div className="page-actions">
                    <button type="button" className="secondary-button" onClick={() => abrir({ tipo: 'unirse' })}>
                        Unirse a un grupo
                    </button>
                    <button type="button" className="primary-button" onClick={() => abrir({ tipo: 'crear' })}>
                        + Crear grupo
                    </button>
                </div>
            </header>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="col-id">#</th>
                            <th>Nombre</th>
                            <th>Fecha creación</th>
                            <th>Fecha modificación</th>
                            <th>Código del grupo</th>
                            <th className="col-num">Integrantes</th>
                            <th className="col-actions">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grupos.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="table-empty">
                                    Todavía no tienes grupos. Crea uno o únete con un código.
                                </td>
                            </tr>
                        ) : grupos.map((grupo, indice) => {
                            const esAdmin = esRolAdministrador(grupo.rol);

                            return (
                                <tr key={grupo.id}>
                                    <td className="col-id">{indice + 1}</td>
                                    <td>
                                        <span className="cell-strong">{grupo.nombre}</span>
                                        <span className={`role-badge${esAdmin ? ' is-admin' : ''}`}>{grupo.rol}</span>
                                    </td>
                                    <td>{fechaCorta(grupo.creado_en)}</td>
                                    <td>{fechaCorta(grupo.actualizado_en)}</td>
                                    <td>
                                        {esAdmin
                                            ? <code className="code-chip">{grupo.codigo_acceso}</code>
                                            : <span className="cell-muted" title="Solo el administrador ve el código">—</span>}
                                    </td>
                                    <td className="col-num">{grupo.cantidad_integrantes}</td>
                                    <td className="col-actions">
                                        <div className="row-actions">
                                            <button type="button" className="link-button" onClick={() => abrir({ tipo: 'ver', grupo })}>
                                                Ver
                                            </button>
                                            {esAdmin && (
                                                <>
                                                    <button type="button" className="link-button" onClick={() => abrir({ tipo: 'modificar', grupo })}>
                                                        Modificar
                                                    </button>
                                                    <button type="button" className="link-button is-danger" onClick={() => abrir({ tipo: 'eliminar', grupo })}>
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

            {(dialogo?.tipo === 'crear' || dialogo?.tipo === 'modificar') && (
                <Modal
                    titulo={dialogo.tipo === 'crear' ? 'Crear grupo' : 'Modificar grupo'}
                    onCerrar={cerrar}
                    acciones={(
                        <>
                            <button type="button" className="secondary-button" onClick={cerrar}>Cancelar</button>
                            <button
                                type="button"
                                className="primary-button"
                                disabled={procesando}
                                onClick={() => (dialogo.tipo === 'crear' ? guardarNuevo() : guardarCambios(dialogo.grupo))}
                            >
                                {procesando ? 'Guardando...' : 'Guardar grupo'}
                            </button>
                        </>
                    )}
                >
                    <label>
                        Nombre del grupo
                        <input
                            type="text"
                            value={texto}
                            onChange={(evento) => setTexto(evento.target.value)}
                            placeholder="Ej: Junta de vecinos"
                            autoFocus
                        />
                    </label>
                    {dialogo.tipo === 'crear' && (
                        <p className="clave-box">El código para invitar a otros se genera automáticamente al guardar el grupo.</p>
                    )}
                    {error && <p className="form-error">{error}</p>}
                </Modal>
            )}

            {dialogo?.tipo === 'unirse' && (
                <Modal
                    titulo="Unirse a un grupo"
                    onCerrar={cerrar}
                    acciones={(
                        <>
                            <button type="button" className="secondary-button" onClick={cerrar}>Cancelar</button>
                            <button type="button" className="primary-button" onClick={unirse} disabled={procesando}>
                                {procesando ? 'Uniéndome...' : 'Unirme'}
                            </button>
                        </>
                    )}
                >
                    <label>
                        Código del grupo
                        <input
                            type="text"
                            value={texto}
                            onChange={(evento) => setTexto(evento.target.value)}
                            placeholder="Ej: ABCD5"
                            autoFocus
                        />
                    </label>
                    {error && <p className="form-error">{error}</p>}
                </Modal>
            )}

            {dialogo?.tipo === 'ver' && <DetalleGrupo grupo={dialogo.grupo} onCerrar={cerrar} />}

            {dialogo?.tipo === 'eliminar' && (
                <ConfirmModal
                    titulo="Eliminar grupo"
                    mensaje={(
                        <p>
                            ¿Seguro que quieres eliminar <strong>{dialogo.grupo.nombre}</strong>? También se eliminarán
                            sus reuniones y formularios. Esta acción no se puede deshacer.
                        </p>
                    )}
                    textoConfirmar="Eliminar grupo"
                    procesando={procesando}
                    error={error}
                    onConfirmar={() => eliminar(dialogo.grupo)}
                    onCerrar={cerrar}
                />
            )}
        </section>
    );
}

// Detalle del grupo: datos, código e integrantes. El administrador puede cambiar el rol de los integrantes.
function DetalleGrupo({ grupo, onCerrar }: { grupo: Grupo; onCerrar: () => void }) {
    const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState<number | null>(null);
    const [error, setError] = useState('');
    const esAdmin = esRolAdministrador(grupo.rol);

    useEffect(() => {
        let cancelado = false;

        listarIntegrantes(grupo.id)
            .then((lista) => {
                if (!cancelado) setIntegrantes(lista);
            })
            .catch(() => {
                if (!cancelado) setError('No se pudieron cargar los integrantes.');
            })
            .finally(() => {
                if (!cancelado) setCargando(false);
            });

        return () => {
            cancelado = true;
        };
    }, [grupo.id]);

    const cambiarRol = async (integranteId: number, rol: RolIntegrante) => {
        setActualizando(integranteId);
        setError('');

        try {
            const actualizado = await actualizarRolIntegrante(grupo.id, integranteId, rol);
            setIntegrantes((actuales) => actuales.map((integrante) => (
                integrante.id === integranteId ? { ...integrante, rol: actualizado.rol } : integrante
            )));
        } catch {
            setError('No se pudo actualizar el rol. Inténtalo nuevamente.');
        } finally {
            setActualizando(null);
        }
    };

    return (
        <Modal
            ancho="medio"
            titulo={grupo.nombre}
            subtitulo="Detalle del grupo"
            onCerrar={onCerrar}
            acciones={<button type="button" className="secondary-button" onClick={onCerrar}>Cerrar</button>}
        >
            <dl className="detail-grid">
                <div>
                    <dt>Fecha creación</dt>
                    <dd>{fechaHora(grupo.creado_en)}</dd>
                </div>
                <div>
                    <dt>Fecha modificación</dt>
                    <dd>{fechaHora(grupo.actualizado_en)}</dd>
                </div>
                <div>
                    <dt>Código del grupo</dt>
                    <dd>{esAdmin ? <code className="code-chip">{grupo.codigo_acceso}</code> : '—'}</dd>
                </div>
                <div>
                    <dt>Tu rol</dt>
                    <dd>{grupo.rol}</dd>
                </div>
            </dl>

            <h4 className="detail-section-title">
                Integrantes <span className="count-badge">{cargando ? '…' : integrantes.length}</span>
            </h4>

            {cargando ? (
                <p className="cell-muted">Cargando integrantes...</p>
            ) : (
                <ul className="detail-list">
                    {integrantes.map((integrante) => (
                        <li key={integrante.id}>
                            <span>{integrante.nombre}</span>
                            {esAdmin && !esRolAdministrador(integrante.rol) ? (
                                <select
                                    aria-label={`Rol de ${integrante.nombre}`}
                                    value={integrante.rol}
                                    disabled={actualizando !== null}
                                    onChange={(evento) => cambiarRol(integrante.id, evento.target.value as RolIntegrante)}
                                >
                                    {!['Integrante', 'Secretaria'].includes(integrante.rol) && (
                                        <option value={integrante.rol}>{integrante.rol}</option>
                                    )}
                                    <option value="Integrante">Integrante</option>
                                    <option value="Secretaria">Secretaria</option>
                                </select>
                            ) : (
                                <span className={`role-badge${esRolAdministrador(integrante.rol) ? ' is-admin' : ''}`}>
                                    {integrante.rol}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {error && <p className="form-error">{error}</p>}
        </Modal>
    );
}
