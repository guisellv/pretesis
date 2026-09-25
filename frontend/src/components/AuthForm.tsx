import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { iniciarSesion, registrarUsuario } from '../services/auth.service';

type AuthFormProps = {
    onLogin: (nombre: string, token: string, id: number) => void;
};

export function AuthForm({ onLogin }: AuthFormProps) {
    const [modo, setModo] = useState<'login' | 'registro'>('login');
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [mensaje, setMensaje] = useState('');

    async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();

        try {
            if (modo === 'login') {
                const respuesta = await iniciarSesion(correo, clave);
                onLogin(respuesta.usuario.nombre, respuesta.token, respuesta.usuario.id);
                return;
            }

            await registrarUsuario(nombre, correo, clave);
            setMensaje('Usuario registrado. Ahora puedes iniciar sesión.');
            setModo('login');
            setNombre('');
            setClave('');
        } catch (error: unknown) {
            const errorApi = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
            setMensaje(errorApi || 'No se pudo completar la operación');
        }
    }

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <h1>Agenda Comunitaria</h1>
                <h2>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

                <form onSubmit={enviarFormulario}>
                    {modo === 'registro' && (
                        <label>
                            Nombre y apellido
                            <input type="text" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
                        </label>
                    )}

                    <label>
                        Correo electrónico
                        <input type="email" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
                    </label>

                    <label>
                        Contraseña
                        <input type="password" value={clave} onChange={(evento) => setClave(evento.target.value)} required />
                    </label>

                    <button className="auth-submit" type="submit">
                        {modo === 'login' ? 'Entrar' : 'Registrarse'}
                    </button>
                </form>

                <p className="auth-message">{mensaje}</p>
                <button className="auth-switch" type="button" onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}>
                    {modo === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
                </button>
            </section>
        </main>
    );
}