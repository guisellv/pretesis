import { useEffect, useState } from "react";
import {
    crearGrupo,
    listarIntegrantes,
    actualizarRolIntegrante,
    unirseGrupo,
    type Grupo,
    type Integrante,
    type RolIntegrante,
} from "../services/groups.service";
import { tituloValido } from "../helpers/titulo";

type PanellateralProps = {
    nombreUsuario: string;
    usuarioId: number | null;
    onLogout: () => void;
    grupos: Grupo[];
    grupoSeleccionadoId: number | null;
    onGrupoCreado: (grupo: Grupo) => void;
    onInicio: () => void;
    onSeleccionarGrupo: (grupo: Grupo) => void;
};

export default function Panellateral({
    nombreUsuario,
    usuarioId,
    onLogout,
    grupos,
    grupoSeleccionadoId,
    onGrupoCreado,
    onInicio,
    onSeleccionarGrupo,
}: PanellateralProps) {
    const [modalAbierta, setModalAbierta] = useState(false);
    const [tipoAccion, setTipoAccion] = useState<"crear" | "unirse" | null>(null);
    const [nombreGrupo, setNombreGrupo] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [codigoGrupo, setCodigoGrupo] = useState("");
    const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
    const [cargandoIntegrantes, setCargandoIntegrantes] = useState(false);
    const [integranteActualizando, setIntegranteActualizando] = useState<number | null>(null);
    const [errorRol, setErrorRol] = useState("");

    const grupoSeleccionado = grupos.find((grupo) => grupo.id === grupoSeleccionadoId) ?? null;
    const esAdministrador = grupoSeleccionado?.rol?.toLowerCase() === "administrador";

    useEffect(() => {
        if (grupoSeleccionadoId === null) {
            setIntegrantes([]);
            return;
        }

        let cancelado = false;
        setCargandoIntegrantes(true);

        listarIntegrantes(grupoSeleccionadoId)
            .then((lista) => {
                if (!cancelado) setIntegrantes(lista);
            })
            .catch(() => {
                if (!cancelado) setIntegrantes([]);
            })
            .finally(() => {
                if (!cancelado) setCargandoIntegrantes(false);
            });

        return () => {
            cancelado = true;
        };
    }, [grupoSeleccionadoId]);

    const cambiarRolIntegrante = async (usuarioId: number, rol: RolIntegrante) => {
        if (grupoSeleccionadoId === null) return;

        setIntegranteActualizando(usuarioId);
        setErrorRol("");

        try {
            const integranteActualizado = await actualizarRolIntegrante(grupoSeleccionadoId, usuarioId, rol);
            setIntegrantes((actuales) => actuales.map((integrante) =>
                integrante.id === usuarioId ? { ...integrante, rol: integranteActualizado.rol } : integrante
            ));
        } catch {
            setErrorRol("No se pudo actualizar el rol. Inténtalo nuevamente.");
        } finally {
            setIntegranteActualizando(null);
        }
    };

    const abrirCrearGrupo = () => {
        setTipoAccion("crear");
        setNombreGrupo("");
        setError("");
        setModalAbierta(true);
    };

    const abrirUnirseGrupo = () => {
        setTipoAccion("unirse");
        setCodigoGrupo("");
        setError("");
        setModalAbierta(true);
    };

    const cerrarModal = () => {
        setModalAbierta(false);
        setNombreGrupo("");
        setCodigoGrupo("");
        setError("");
    };

    const guardarGrupo = async () => {
        if (!nombreGrupo.trim()) {
            setError("Escribe un nombre para el grupo.");
            return;
        }

        if (!tituloValido(nombreGrupo)) {
            setError("El nombre del grupo debe tener al menos una letra, no puede ser solo números.");
            return;
        }

        setGuardando(true);
        setError("");

        try {
            if (usuarioId === null) {
                setError("No se pudo identificar al usuario.");
                return;
            }

            const grupo = await crearGrupo(nombreGrupo.trim());
            onGrupoCreado(grupo);
            cerrarModal();
        } catch {
            setError("No se pudo crear el grupo. Inténtalo nuevamente.");
        } finally {
            setGuardando(false);
        }
    };

    const manejarUnirse = async () => {
        if (!codigoGrupo.trim()) {
            setError("Escribe el código.");
            return;
        }

        if (usuarioId === null) {
            setError("No se pudo identificar al usuario.");
            return;
        }

        setGuardando(true);
        setError("");

        try {
            const grupo = await unirseGrupo(usuarioId, codigoGrupo);
            onGrupoCreado(grupo);
            cerrarModal();
        } catch {
            setError("El código no es válido o ya perteneces a este grupo.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <aside className="panel-sidebar">
            <h2>Agenda Comunitaria</h2>
            <button
                className={`home-button ${grupoSeleccionadoId === null ? "selected" : ""}`}
                type="button"
                onClick={onInicio}
            >
                Inicio
            </button>

            {grupoSeleccionado ? (
                <div className="group-panel">
                    <h3 className="group-title">{grupoSeleccionado.nombre}</h3>

                    <h3>Integrantes</h3>
                    <div className="member-list">
                        {cargandoIntegrantes ? (
                            <p className="empty-groups">Cargando integrantes...</p>
                        ) : integrantes.length === 0 ? (
                            <p className="empty-groups">No hay integrantes.</p>
                        ) : (
                            integrantes.map((integrante) => (
                                <div className="member-item" key={integrante.id}>
                                    <span>{integrante.nombre}</span>
                                    {esAdministrador && integrante.rol.toLowerCase() !== "administrador" ? (
                                        <select
                                            aria-label={`Rol de ${integrante.nombre}`}
                                            value={integrante.rol}
                                            disabled={integranteActualizando !== null}
                                            onChange={(event) => cambiarRolIntegrante(
                                                integrante.id,
                                                event.target.value as RolIntegrante
                                            )}
                                        >
                                            {!['Integrante', 'Secretaria'].includes(integrante.rol) && (
                                                <option value={integrante.rol}>{integrante.rol}</option>
                                            )}
                                            <option value="Integrante">Integrante</option>
                                            <option value="Secretaria">Secretaria</option>
                                        </select>
                                    ) : (
                                        <small>{integrante.rol}</small>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    {errorRol && <p className="member-error" role="alert">{errorRol}</p>}
                </div>
            ) : (
                <div className="group-panel">
                    <div className="group-actions">
                        <button type="button" onClick={abrirCrearGrupo}>Crear grupo</button>
                        <button type="button" onClick={abrirUnirseGrupo}>Unirse a un grupo</button>
                    </div>

                    <h3>Mis grupos</h3>
                    <div className="group-list">
                        {grupos.length === 0 ? (
                            <p className="empty-groups">Todavía no tienes grupos.</p>
                        ) : (
                            grupos.map((grupo) => (
                                <button
                                    className={`group-item ${grupo.id === grupoSeleccionadoId ? "selected" : ""}`}
                                    key={grupo.id}
                                    type="button"
                                    onClick={() => onSeleccionarGrupo(grupo)}
                                >
                                    {grupo.nombre}
                                </button>
                            ))
                        )}
                    </div>

                    {modalAbierta && (
                        <div className="modal-overlay">
                            <div className="modal-box">
                                <h3>
                                    {tipoAccion === "crear" ? "Crear grupo" : "Unirse a un grupo"}
                                </h3>

                                {tipoAccion === "crear" ? (
                                    <>
                                        <label>
                                            Nombre del grupo
                                            <input
                                                type="text"
                                                value={nombreGrupo}
                                                onChange={(e) => setNombreGrupo(e.target.value)}
                                                placeholder="Ej: Junta de vecinos"
                                            />
                                        </label>

                                        <div className="clave-box">
                                            <span>La clave del grupo se genera automáticamente al guardarlo.</span>
                                        </div>

                                        <button type="button" className="primary-button" onClick={guardarGrupo} disabled={guardando}>
                                            {guardando ? "Guardando..." : "Guardar grupo"}
                                        </button>
                                        {error && <p className="form-error">{error}</p>}
                                    </>
                                ) : (
                                    <>
                                        <label>
                                            Ingresa la clave del grupo
                                            <input
                                                type="text"
                                                value={codigoGrupo}
                                                onChange={(e) => setCodigoGrupo(e.target.value)}
                                                placeholder="Ej: ABCD5"
                                            />
                                        </label>
                                        <button type="button" className="primary-button" onClick={manejarUnirse} disabled={guardando}>
                                            {guardando ? "Uniéndome..." : "Unirme"}
                                        </button>
                                        {error && <p className="form-error">{error}</p>}
                                    </>
                                )}

                                <button type="button" className="secondary-button" onClick={cerrarModal}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <button className="logout-button" onClick={onLogout}>
                Cerrar sesión
            </button>
        </aside>
    );
}

