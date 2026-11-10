// Un título válido tiene al menos una letra (incluye tildes y ñ): "Reunión 3" sí, "123" no
export function tituloValido(titulo: unknown): titulo is string {
    return typeof titulo === 'string' && /\p{L}/u.test(titulo);
}
