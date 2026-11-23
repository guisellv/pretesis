import type { ReactNode } from "react";

export type Seccion = "inicio" | "grupos" | "reuniones" | "usuarios";

type PanellateralProps = {
    nombreUsuario: string;
    esAdminSistema: boolean;
    seccion: Seccion;
    onCambiarSeccion: (seccion: Seccion) => void;
    onLogout: () => void;
};

const trazo = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
};

const ICONOS: Record<Seccion, ReactNode> = {
    inicio: (
        <svg {...trazo}>
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
        </svg>
    ),
    grupos: (
        <svg {...trazo}>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
            <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.7 3.5 5.7" />
        </svg>
    ),
    reuniones: (
        <svg {...trazo}>
            <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
            <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
    ),
    usuarios: (
        <svg {...trazo}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
    ),
};

const NOMBRES: Record<Seccion, string> = {
    inicio: "Inicio",
    grupos: "Grupos",
    reuniones: "Reuniones",
    usuarios: "Usuarios",
};

export default function Panellateral({
    nombreUsuario,
    esAdminSistema,
    seccion,
    onCambiarSeccion,
    onLogout,
}: PanellateralProps) {
    const secciones: Seccion[] = esAdminSistema
        ? ["inicio", "grupos", "reuniones", "usuarios"]
        : ["inicio", "grupos", "reuniones"];
    const inicial = nombreUsuario.trim().charAt(0).toUpperCase() || "?";

    return (
        <aside className="panel-sidebar">
            <h2 className="sidebar-brand">Agenda Comunitaria</h2>

            <nav className="sidebar-nav" aria-label="Menú principal">
                {secciones.map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={`sidebar-link${seccion === item ? " selected" : ""}`}
                        aria-current={seccion === item ? "page" : undefined}
                        onClick={() => onCambiarSeccion(item)}
                    >
                        {ICONOS[item]}
                        {NOMBRES[item]}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <span className="sidebar-avatar" aria-hidden="true">{inicial}</span>
                    <strong title={nombreUsuario}>{nombreUsuario || "Usuario"}</strong>
                </div>

                <button type="button" className="logout-button" onClick={onLogout}>
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}
