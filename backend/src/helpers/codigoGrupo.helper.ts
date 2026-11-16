import { randomInt } from 'crypto';

// Sin I, L ni O para que el código no se confunda con 1 o 0 al dictarlo o copiarlo
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ';

export const LARGO_INICIAL_CODIGO = 5;
export const LARGO_MAXIMO_CODIGO = 10;

// Genera un código de acceso aleatorio. Se usa crypto (no Math.random) para que no sea predecible.
export function generarCodigoGrupo(largo = LARGO_INICIAL_CODIGO): string {
    return Array.from({ length: largo }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

// El largo crece cuando un código choca con otro ya existente: con pocos grupos bastan 5 letras,
// y a medida que se crean más grupos el sistema pasa solo a 6, 7... sin tener que cambiar código.
export function largoParaIntento(intento: number): number {
    return Math.min(LARGO_INICIAL_CODIGO + Math.floor(intento / 3), LARGO_MAXIMO_CODIGO);
}
