import api from "../api";

export interface LoginData {
    correo: string;
    clave: string;
}

export interface RegisterData extends LoginData {
    nombre: string;
}

export interface AuthUser {
    id: number;
    nombre: string;
}

export interface AuthResponse {
    token: string;
    usuario: AuthUser;
}

export async function loginUser(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", data);
    return response.data;
}

export async function registerUser(data: RegisterData): Promise<void> {
    await api.post("/auth/registro", data);
}
