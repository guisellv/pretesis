export type Migracion = {
    // Nombre único; se guarda en la tabla "migraciones" para no ejecutarla dos veces.
    nombre: string;
    up: string;
};
