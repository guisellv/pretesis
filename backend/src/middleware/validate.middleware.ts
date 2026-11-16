import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

type Esquemas = {
    params?: ZodType;
    query?: ZodType;
    body?: ZodType;
};

// Valida lo que llega del cliente con los esquemas de src/validations.
// Si algo no cumple responde 400; si todo está bien, deja en req los datos ya limpios
// (textos sin espacios extra, ids convertidos a número, etc.) y pasa al controlador.
export function validar(esquemas: Esquemas) {
    return (req: Request, res: Response, next: NextFunction): Response | void => {
        for (const parte of ['params', 'query', 'body'] as const) {
            const esquema = esquemas[parte];
            if (!esquema) continue;

            const resultado = esquema.safeParse(req[parte] ?? {});

            if (!resultado.success) {
                return res.status(400).json({
                    error: resultado.error.issues[0].message,
                    detalles: resultado.error.issues.map((issue) => ({
                        campo: issue.path.join('.'),
                        mensaje: issue.message,
                    })),
                });
            }

            // En Express 5 req.query es de solo lectura, por eso se redefine
            Object.defineProperty(req, parte, {
                value: resultado.data,
                writable: true,
                configurable: true,
                enumerable: true,
            });
        }

        next();
    };
}
