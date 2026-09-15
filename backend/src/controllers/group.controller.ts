import { Request, Response } from "express";
import { unirseAGrupo } from "../services/group.service";

export async function joinGroup(req: Request, res: Response): Promise<void> {
    const { usuario_id, codigo_acceso, rol_solicitado } = req.body;

    try {
        const grupo = await unirseAGrupo({ usuario_id, codigo_acceso, rol_solicitado });

        if (!grupo) {
            res.status(404).json({ error: "Código de acceso inválido" });
            return;
        }

        res.status(200).json({ mensaje: `Te has unido exitosamente a: ${grupo.nombre}` });
    } catch (error: any) {
        if (error.code === "23505") {
            res.status(400).json({ error: "Ya eres miembro de este grupo" });
            return;
        }

        res.status(500).json({ error: "Error al unirse al grupo" });
    }
}
