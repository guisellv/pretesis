import { useState } from "react";
import { crearGrupo, unirseGrupo, type Grupo } from "../services/groups.service";

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

function generarClaveUnica(): string {
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let clave = "";

    for (let i = 0; i < 5; i++) {
        const indice = Math.floor(Math.random() * letras.length);
        clave += letras[indice];
    }

    return clave;
}

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
    const [claveGrupo, setClaveGrupo] = useState(generarClaveUnica());
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [codigoGrupo, setCodigoGrupo] = useState("");

    const abrirCrearGrupo = () => {
        setTipoAccion("crear");
        setNombreGrupo("");
        setClaveGrupo(generarClaveUnica());
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

        setGuardando(true);
        setError("");

        try {
            if (usuarioId === null) {
                setError("No se pudo identificar al usuario.");
                return;
            }

            const grupo = await crearGrupo(nombreGrupo.trim(), claveGrupo, usuarioId);
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
            setError("Escribe el código del grupo.");
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
                                        <span>Clave:</span>
                                        <strong>{claveGrupo}</strong>
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
            <button className="logout-button" onClick={onLogout}>
                Cerrar sesión
            </button>
        </aside>
    );
}

