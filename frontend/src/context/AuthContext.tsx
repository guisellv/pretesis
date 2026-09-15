import { createContext, useContext, useState, type ReactNode } from "react";
import { loginUser, type AuthUser } from "../services/auth.service";

interface AuthContextValue {
    user: AuthUser | null;
    login: (correo: string, clave: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);

    async function login(correo: string, clave: string) {
        const response = await loginUser({ correo, clave });
        localStorage.setItem("token", response.token);
        setUser(response.usuario);
    }

    function logout() {
        localStorage.removeItem("token");
        setUser(null);
    }

    return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuthContext debe usarse dentro de AuthProvider");
    }

    return context;
}
