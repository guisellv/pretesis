import jwt from 'jsonwebtoken';

export function obtenerSecreto(): string {
    const secreto = process.env.JWT_SECRET;

    if (!secreto) {
        throw new Error('Falta la variable JWT_SECRET en el archivo .env');
    }

    return secreto;
}

export function generarToken(id: number): string {
    return jwt.sign(
        { id },
        obtenerSecreto(),
        { expiresIn: '8h' }
    );
}
