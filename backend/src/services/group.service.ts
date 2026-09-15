import { pool } from "../config/database";
import { JoinGroupData } from "../entities/group.entity";

export async function unirseAGrupo(datos: JoinGroupData) {
    const grupoResult = await pool.query(
        "SELECT id, nombre FROM grupos WHERE codigo_acceso = $1",
        [datos.codigo_acceso]
    );
    const grupo = grupoResult.rows[0];

    if (!grupo) {
        return null;
    }

    await pool.query(
        "INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol) VALUES ($1, $2, $3)",
        [datos.usuario_id, grupo.id, datos.rol_solicitado || "Lector"]
    );

    return grupo;
}
