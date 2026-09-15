import { useState } from "react";

export function GroupPanel() {
    const [action, setAction] = useState("");

    return (
        <aside className="group-panel">
            <div>
                <p className="eyebrow">Comunidad</p>
                <h2>Grupos</h2>
                <p className="panel-copy">Organiza actividades y comparte tu agenda con otras personas.</p>
            </div>

            <label className="group-select-label" htmlFor="group-action">Acciones de grupo</label>
            <select id="group-action" value={action} onChange={(event) => setAction(event.target.value)}>
                <option value="">Selecciona una opción</option>
                <option value="crear">Crear grupo</option>
                <option value="unirme">Unirme a un grupo</option>
            </select>

            {action && (
                <div className="group-action-box">
                    <strong>{action === "crear" ? "Crear grupo" : "Unirme a un grupo"}</strong>
                    <p>{action === "crear" ? "Próximamente podrás crear tu propio grupo." : "Próximamente podrás ingresar con un código de acceso."}</p>
                </div>
            )}
        </aside>
    );
}
