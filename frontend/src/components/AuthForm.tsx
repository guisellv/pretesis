import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { iniciarSesion, registrarUsuario, restablecerClave, solicitarRecuperacion } from '../services/auth.service';

type AuthFormProps = {
    onLogin: (nombre: string, token: string, id: number) => void;
};

type Modo = 'login' | 'registro' | 'recuperar' | 'restablecer';

const TITULOS: Record<Modo, string> = {
    login: 'Iniciar sesión',
    registro: 'Crear cuenta',
    recuperar: 'Recuperar contraseña',
    restablecer: 'Nueva contraseña',
};

const BOTONES: Record<Modo, string> = {
    login: 'Iniciar sesión',
    registro: 'Registrarse',
    recuperar: 'Enviar código',
    restablecer: 'Cambiar contraseña',
};

type CampoClaveProps = {
    etiqueta: string;
    valor: string;
    onChange: (valor: string) => void;
    autoComplete: string;
};

function CampoClave({ etiqueta, valor, onChange, autoComplete }: CampoClaveProps) {
    const [visible, setVisible] = useState(false);

    return (
        <label>
            {etiqueta}
            <span className="password-field">
                <input
                    type={visible ? 'text' : 'password'}
                    value={valor}
                    onChange={(evento) => onChange(evento.target.value)}
                    autoComplete={autoComplete}
                    required
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                    {visible ? (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            </span>
        </label>
    );
}

export function AuthForm({ onLogin }: AuthFormProps) {
    const [modo, setModo] = useState<Modo>('login');
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [codigo, setCodigo] = useState('');
    const [confirmarClave, setConfirmarClave] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);

    function cambiarModo(nuevoModo: Modo) {
        setModo(nuevoModo);
        setMensaje('');
        setClave('');
        setCodigo('');
        setConfirmarClave('');
    }

    async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setEnviando(true);

        try {
            if (modo === 'login') {
                const respuesta = await iniciarSesion(correo, clave);
                onLogin(respuesta.usuario.nombre, respuesta.token, respuesta.usuario.id);
                return;
            }

            if (modo === 'registro') {
                await registrarUsuario(nombre, correo, clave);
                cambiarModo('login');
                setNombre('');
                setMensaje('Usuario registrado. Ahora puedes iniciar sesión.');
                return;
            }

            if (modo === 'recuperar') {
                const respuesta = await solicitarRecuperacion(correo);
                cambiarModo('restablecer');
                setMensaje(respuesta.mensaje);
                return;
            }

            if (clave !== confirmarClave) {
                setMensaje('Las contraseñas no coinciden');
                return;
            }

            const respuesta = await restablecerClave(correo, codigo, clave);
            cambiarModo('login');
            setMensaje(respuesta.mensaje);
        } catch (error: unknown) {
            const errorApi = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
            setMensaje(errorApi || 'No se pudo completar la operación');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <h1>Agenda Comunitaria</h1>
                {modo !== 'login' && <h2>{TITULOS[modo]}</h2>}

                {modo === 'recuperar' && (
                    <p className="auth-hint">Ingresa tu correo y te enviaremos un código para crear una nueva contraseña.</p>
                )}

                <form onSubmit={enviarFormulario}>
                    {modo === 'registro' && (
                        <label>
                            Nombre y apellido
                            <input type="text" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
                        </label>
                    )}

                    <label>
                        Correo electrónico
                        <input
                            type="email"
                            value={correo}
                            onChange={(evento) => setCorreo(evento.target.value)}
                            autoComplete="email"
                            readOnly={modo === 'restablecer'}
                            required
                        />
                    </label>

                    {modo === 'restablecer' && (
                        <label>
                            Código de verificación
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={codigo}
                                onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ''))}
                                autoComplete="one-time-code"
                                required
                            />
                        </label>
                    )}

                    {modo !== 'recuperar' && (
                        <CampoClave
                            etiqueta={modo === 'restablecer' ? 'Nueva contraseña' : 'Contraseña'}
                            valor={clave}
                            onChange={setClave}
                            autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                        />
                    )}

                    {modo === 'restablecer' && (
                        <CampoClave
                            etiqueta="Confirmar nueva contraseña"
                            valor={confirmarClave}
                            onChange={setConfirmarClave}
                            autoComplete="new-password"
                        />
                    )}

                    <button className="auth-submit" type="submit" disabled={enviando}>
                        {enviando ? 'Procesando...' : BOTONES[modo]}
                    </button>
                </form>

                <p className="auth-message">{mensaje}</p>

                {(modo === 'login' || modo === 'registro') && (
                    <button className="auth-switch" type="button" onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}>
                        {modo === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
                    </button>
                )}

                {modo === 'login' && (
                    <button className="auth-switch auth-forgot" type="button" onClick={() => cambiarModo('recuperar')}>
                        ¿Olvidaste tu contraseña?
                    </button>
                )}

                {modo === 'restablecer' && (
                    <button className="auth-switch" type="button" onClick={() => cambiarModo('recuperar')}>
                        Reenviar código
                    </button>
                )}

                {(modo === 'recuperar' || modo === 'restablecer') && (
                    <button className="auth-switch auth-back" type="button" onClick={() => cambiarModo('login')}>
                        Volver a iniciar sesión
                    </button>
                )}
            </section>
        </main>
    );
}
