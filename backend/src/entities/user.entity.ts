export interface AuthCredentials {
    correo: string;
    clave: string;
}

export interface RegisterUserData extends AuthCredentials {
    nombre: string;
}

export interface UserRecord {
    id: number;
    nombreCompleto: string;
    email: string;
    clave: string;
    rol: string;
}
