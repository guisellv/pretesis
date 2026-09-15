import { useState, type FormEvent } from 'react';
import api from './api';
import PanelPrincipal from './pages/Inicio';

function App() {
    const [modo, setModo] = useState<'login' | 'registro'>('login');
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [mensaje, setMensaje] = useState('');
    
    // 1. NUEVO: Estado para saber si la sesión está activa
    const [sesionIniciada, setSesionIniciada] = useState(false);

    async function iniciarSesion(evento: FormEvent) {
        evento.preventDefault();

        try {
            const respuesta = await api.post('/auth/login', { correo, clave });
            localStorage.setItem('token', respuesta.data.token);
            
            // 2. NUEVO: Guardamos el nombre del usuario y cambiamos el estado a logueado
            setNombre(respuesta.data.usuario.nombre);
            setSesionIniciada(true);
            setMensaje(''); 
        } catch {
            setMensaje('Correo o contraseña incorrectos');
        }
    }

    async function registrarUsuario(evento: FormEvent) {
        evento.preventDefault();

        try {
            await api.post('/auth/registro', { nombre, correo, clave });
            setMensaje('Usuario registrado. Ahora puedes iniciar sesión.');
            setModo('login');
            setNombre('');
            setClave('');
        } catch (error: any) {
            setMensaje(error.response?.data?.error || 'No se pudo registrar el usuario');
        }
    }

    // 3. NUEVO: Función para cerrar sesión y volver a la pantalla de login
    const cerrarSesion = () => {
        localStorage.removeItem('token');
        setSesionIniciada(false);
        setNombre('');
        setCorreo('');
        setClave('');
    };

    // 4. NUEVO: La "magia". Si la sesión inició con éxito, mostramos el calendario.
    if (sesionIniciada) {
        return <PanelPrincipal nombreUsuario={nombre} onLogout={cerrarSesion} />;
    }

    // Si no ha iniciado sesión, mostramos tu formulario normal
    return (
        <main className="auth-shell">
            <section className="auth-card">
            <h1>Agenda Comunitaria</h1>
            <h2>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

            <form onSubmit={modo === 'login' ? iniciarSesion : registrarUsuario}>
                {modo === 'registro' && (
                    <label>
                        Nombre y apellido
                        <input
                            type="text"
                            value={nombre}
                            onChange={(evento) => setNombre(evento.target.value)}
                            required
                        />
                    </label>
                )}

                <label>
                    Correo electrónico
                    <input
                        type="email"
                        value={correo}
                        onChange={(evento) => setCorreo(evento.target.value)}
                        required
                    />
                </label>

                <label>
                    Contraseña
                    <input
                        type="password"
                        value={clave}
                        onChange={(evento) => setClave(evento.target.value)}
                        required
                    />
                </label>

                <button className="auth-submit" type="submit">
                    {modo === 'login' ? 'Entrar' : 'Registrarse'}
                </button>
            </form>

            <p className="auth-message">{mensaje}</p>
            
            <button className="auth-switch"
                onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
                style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
                {modo === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
            </button>
            </section>
        </main>
    );
}

export default App;