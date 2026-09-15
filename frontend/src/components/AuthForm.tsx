import { useState, type FormEvent } from "react";
import { getApiErrorMessage } from "../helpers/api-error.helper";
import { useAuth } from "../hooks/useAuth";
import { registerUser } from "../services/auth.service";

interface AuthFormProps {
    mode: "login" | "registro";
    onModeChange: (mode: "login" | "registro") => void;
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
    const { login } = useAuth();
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [clave, setClave] = useState("");
    const [mensaje, setMensaje] = useState("");

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        try {
            if (mode === "login") {
                await login(correo, clave);
                setMensaje("Inicio de sesión exitoso");
            } else {
                await registerUser({ nombre, correo, clave });
                setMensaje("Usuario registrado. Ahora puedes iniciar sesión.");
                onModeChange("login");
                setNombre("");
                setClave("");
            }
        } catch (error) {
            setMensaje(getApiErrorMessage(error, "No se pudo completar la operación"));
        }
    }

    return (
        <>
            <h2>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
            <form onSubmit={handleSubmit}>
                {mode === "registro" && (
                    <label>
                        Nombre y apellido
                        <input type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} required />
                    </label>
                )}
                <label>
                    Correo electrónico
                    <input type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} required />
                </label>
                <label>
                        Clave
                        <input type="password" value={clave} onChange={(event) => setClave(event.target.value)} required />
                </label>
                <button type="submit">{mode === "login" ? "Entrar" : "Registrarse"}</button>
            </form>
            <p>{mensaje}</p>
            <button onClick={() => onModeChange(mode === "login" ? "registro" : "login")}>
                {mode === "login" ? "Crear una cuenta" : "Ya tengo una cuenta"}
            </button>
        </>
    );
}
