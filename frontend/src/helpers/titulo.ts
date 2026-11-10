// Un título válido tiene al menos una letra (incluye tildes y ñ): "Reunión 3" sí, "123" no
export function tituloValido(titulo: string): boolean {
    return /\p{L}/u.test(titulo);
}
