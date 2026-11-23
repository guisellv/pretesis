import { useEffect, useState } from 'react';
import {
    actualizarUsuario,
    crearUsuario,
    eliminarUsuario,
    listarUsuarios,
    verUsuario,
    type DatosUsuario,
    type UsuarioDetalle,
    type UsuarioSistema,
} from '../services/users.service';
import { coincideBusqueda, esRolAdministrador, fechaCorta, fechaHora, mensajeError } from '../helpers/formato';
import { ConfirmModal, Modal } from '../components/Modal';
import { FiltroSelect, FiltrosTabla } from '../components/FiltrosTabla';

type UsuariosPageProps = {
    usuarioActualId: number | null;
};

type Dialogo =
    | { tipo: 'crear' }
    | { tipo: 'ver'; usuario: UsuarioSistema }
    | { tipo: 'modificar'; usuario: UsuarioSistema }
    | { tipo: 'eliminar'; usuario: UsuarioSistema };

const datosVacios: DatosUsuario = { nombre: '', correo: '', rol: 'usuario', clave: '' };

const NOMBRE_ROL = { usuario: 'Usuario', admin: 'Administrador del sistema' } as const;

type FiltroRol = 'todos' | 'usuario' | 'admin';

const filtrosIniciales = { busqueda: '', rol: 'todos' as FiltroRol };

export default function UsuariosPage({ usuarioActualId }: UsuariosPageProps) {
    const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState('');
    const [dialogo, setDialogo] = useState<Dialogo | null>(null);
    const [datos, setDatos] = useState<DatosUsuario>(datosVacios);
    const [error, setError] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [filtros, setFiltros] = useState(filtrosIniciales);

    useEffect(() => {
        listarUsuarios()
            .then(setUsuarios)
            .catch((errorDesconocido: unknown) => {
                setErrorCarga(mensajeError(errorDesconocido, 'No se pudieron cargar los usuarios.'));
            })
            .finally(() => setCargando(false));
    }, []);

    const abrir = (nuevo: Dialogo) => {
        setDialogo(nuevo);
        setError('');
        setDatos(nuevo.tipo === 'modificar'
            ? { nombre: nuevo.usuario.nombre, correo: nuevo.usuario.correo, rol: nuevo.usuario.rol, clave: '' }
            : datosVacios);
    };

    const cerrar = () => {
        setDialogo(null);
        setError('');
    };

    const guardar = async () => {
        if (!dialogo || (dialogo.tipo !== 'crear' && dialogo.tipo !== 'modificar')) return;

        if (!datos.nombre.trim() || !datos.correo.trim()) {
            setError('Completa el nombre y el correo.');
            return;
        }

        if (dialogo.tipo === 'crear' && datos.clave.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (dialogo.tipo === 'modificar' && datos.clave && datos.clave.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setProcesando(true);
        setError('');

        try {
            if (dialogo.tipo === 'crear') {
                const creado = await crearUsuario(datos);
                setUsuarios((actuales) => [...actuales, creado]);
            } else {
                const actualizado = await actualizarUsuario(dialogo.usuario.id, datos);
                setUsuarios((actuales) => actuales.map((usuario) => (usuario.id === actualizado.id ? actualizado : usuario)));
            }
            cerrar();
        } catch (errorDesconocido: unknown) {
            setError(mensajeError(errorDesconocido, 'No se pudo guardar el usuario.'));
        } finally {
            setProcesando(false);
        }
    };

    const eliminar = async (usuario: UsuarioSistema) => {
        setProcesando(true);
        setError('');

        try {
            await eliminarUsuario(usuario.id);
            setUsuarios((actuales) => actuales.filter((item) => item.id !== usuario.id));
            cerrar();
        } catch (errorDesconocido: unknown) {
            setError(mensajeError(errorDesconocido, 'No se pudo eliminar el usuario.'));
        } finally {
            setProcesando(false);
        }
    };

    // El número (#) se asigna antes de filtrar, así un usuario mantiene su número al buscar
    const numerados = usuarios.map((usuario, indice) => ({ usuario, numero: indice + 1 }));
    const filtrados = numerados.filter(({ usuario }) => (
        coincideBusqueda(filtros.busqueda, usuario.nombre, usuario.correo)
        && (filtros.rol === 'todos' || usuario.rol === filtros.rol)
    ));
    const hayFiltros = filtros.busqueda !== '' || filtros.rol !== 'todos';

    const editandoseASiMismo = dialogo?.tipo === 'modificar' && dialogo.usuario.id === usuarioActualId;

    return (
        <section className="page-card">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Usuarios</h1>
                    <p className="page-subtitle">Usuarios registrados en el sistema.</p>
                </div>
                <div className="page-actions">
                    <button type="button" className="primary-button" onClick={() => abrir({ tipo: 'crear' })}>
                        + Crear usuario
                    </button>
                </div>
            </header>

            {errorCarga && <p className="form-error" role="alert">{errorCarga}</p>}

            <FiltrosTabla
                busqueda={filtros.busqueda}
                onBusqueda={(busqueda) => setFiltros({ ...filtros, busqueda })}
                placeholder="Buscar por nombre o correo"
                total={usuarios.length}
                visibles={filtrados.length}
                hayFiltros={hayFiltros}
                onLimpiar={() => setFiltros(filtrosIniciales)}
            >
                <FiltroSelect
                    etiqueta="Rol"
                    valor={filtros.rol}
                    onCambiar={(rol) => setFiltros({ ...filtros, rol })}
                    opciones={[
                        { valor: 'todos', texto: 'Todos' },
                        { valor: 'usuario', texto: 'Usuario' },
                        { valor: 'admin', texto: 'Administrador del sistema' },
                    ]}
                />
            </FiltrosTabla>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="col-id">#</th>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th className="col-num">Grupos</th>
                            <th>Fecha creación</th>
                            <th className="col-actions">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan={7} className="table-empty">Cargando usuarios...</td></tr>
                        ) : filtrados.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="table-empty">
                                    {usuarios.length === 0 ? 'No hay usuarios.' : 'Ningún usuario coincide con los filtros.'}
                                </td>
                            </tr>
                        ) : filtrados.map(({ usuario, numero }) => (
                            <tr key={usuario.id}>
                                <td className="col-id">{numero}</td>
                                <td className="cell-strong">
                                    {usuario.nombre}
                                    {usuario.id === usuarioActualId && <span className="role-badge">Tú</span>}
                                </td>
                                <td>{usuario.correo}</td>
                                <td>
                                    <span className={`role-badge${usuario.rol === 'admin' ? ' is-admin' : ''}`}>
                                        {NOMBRE_ROL[usuario.rol]}
                                    </span>
                                </td>
                                <td className="col-num">{usuario.cantidad_grupos}</td>
                                <td>{fechaCorta(usuario.creado_en)}</td>
                                <td className="col-actions">
                                    <div className="row-actions">
                                        <button type="button" className="link-button" onClick={() => abrir({ tipo: 'ver', usuario })}>
                                            Ver
                                        </button>
                                        <button type="button" className="link-button" onClick={() => abrir({ tipo: 'modificar', usuario })}>
                                            Modificar
                                        </button>
                                        {usuario.id !== usuarioActualId && (
                                            <button
                                                type="button"
                                                className="link-button is-danger"
                                                onClick={() => abrir({ tipo: 'eliminar', usuario })}
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(dialogo?.tipo === 'crear' || dialogo?.tipo === 'modificar') && (
                <Modal
                    titulo={dialogo.tipo === 'crear' ? 'Crear usuario' : 'Modificar usuario'}
                    onCerrar={cerrar}
                    acciones={(
                        <>
                            <button type="button" className="secondary-button" onClick={cerrar}>Cancelar</button>
                            <button type="button" className="primary-button" onClick={guardar} disabled={procesando}>
                                {procesando ? 'Guardando...' : 'Guardar usuario'}
                            </button>
                        </>
                    )}
                >
                    <label>
                        Nombre y apellido
                        <input
                            type="text"
                            value={datos.nombre}
                            onChange={(evento) => setDatos({ ...datos, nombre: evento.target.value })}
                            autoFocus
                        />
                    </label>
                    <label>
                        Correo electrónico
                        <input
                            type="email"
                            value={datos.correo}
                            onChange={(evento) => setDatos({ ...datos, correo: evento.target.value })}
                        />
                    </label>
                    <label>
                        Rol
                        <select
                            value={datos.rol}
                            disabled={editandoseASiMismo}
                            onChange={(evento) => setDatos({ ...datos, rol: evento.target.value as DatosUsuario['rol'] })}
                        >
                            <option value="usuario">{NOMBRE_ROL.usuario}</option>
                            <option value="admin">{NOMBRE_ROL.admin}</option>
                        </select>
                    </label>
                    <label>
                        {dialogo.tipo === 'crear' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
                        <input
                            type="password"
                            value={datos.clave}
                            autoComplete="new-password"
                            placeholder={dialogo.tipo === 'modificar' ? 'Déjala vacía para no cambiarla' : 'Mínimo 6 caracteres'}
                            onChange={(evento) => setDatos({ ...datos, clave: evento.target.value })}
                        />
                    </label>
                    {error && <p className="form-error">{error}</p>}
                </Modal>
            )}

            {dialogo?.tipo === 'ver' && <DetalleUsuario usuarioId={dialogo.usuario.id} onCerrar={cerrar} />}

            {dialogo?.tipo === 'eliminar' && (
                <ConfirmModal
                    titulo="Eliminar usuario"
                    mensaje={(
                        <p>
                            ¿Seguro que quieres eliminar a <strong>{dialogo.usuario.nombre}</strong> ({dialogo.usuario.correo})?
                            Saldrá de todos sus grupos. Esta acción no se puede deshacer.
                        </p>
                    )}
                    textoConfirmar="Eliminar usuario"
                    procesando={procesando}
                    error={error}
                    onConfirmar={() => eliminar(dialogo.usuario)}
                    onCerrar={cerrar}
                />
            )}
        </section>
    );
}

function DetalleUsuario({ usuarioId, onCerrar }: { usuarioId: number; onCerrar: () => void }) {
    const [usuario, setUsuario] = useState<UsuarioDetalle | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        verUsuario(usuarioId)
            .then(setUsuario)
            .catch((errorDesconocido: unknown) => setError(mensajeError(errorDesconocido, 'No se pudo cargar el usuario.')));
    }, [usuarioId]);

    return (
        <Modal
            ancho="medio"
            titulo={usuario?.nombre ?? 'Detalle del usuario'}
            subtitulo={usuario?.correo}
            onCerrar={onCerrar}
            acciones={<button type="button" className="secondary-button" onClick={onCerrar}>Cerrar</button>}
        >
            {error && <p className="form-error">{error}</p>}
            {!usuario && !error && <p className="cell-muted">Cargando...</p>}

            {usuario && (
                <>
                    <dl className="detail-grid">
                        <div>
                            <dt>Rol</dt>
                            <dd>{NOMBRE_ROL[usuario.rol]}</dd>
                        </div>
                        <div>
                            <dt>Grupos</dt>
                            <dd>{usuario.cantidad_grupos}</dd>
                        </div>
                        <div>
                            <dt>Fecha creación</dt>
                            <dd>{fechaHora(usuario.creado_en)}</dd>
                        </div>
                        <div>
                            <dt>Fecha modificación</dt>
                            <dd>{fechaHora(usuario.actualizado_en)}</dd>
                        </div>
                    </dl>

                    <h4 className="detail-section-title">
                        Grupos <span className="count-badge">{usuario.grupos.length}</span>
                    </h4>
                    {usuario.grupos.length === 0 ? (
                        <p className="cell-muted">No pertenece a ningún grupo.</p>
                    ) : (
                        <ul className="detail-list">
                            {usuario.grupos.map((grupo) => (
                                <li key={grupo.id}>
                                    <span>{grupo.nombre}</span>
                                    <span className={`role-badge${esRolAdministrador(grupo.rol) ? ' is-admin' : ''}`}>{grupo.rol}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </Modal>
    );
}
