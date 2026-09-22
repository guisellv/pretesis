import { useState } from 'react';
import { AuthForm } from './components/AuthForm';
import DashboardPage from './pages/DashboardPage';

function App() {
    const [nombre, setNombre] = useState(() => localStorage.getItem('usuarioNombre') ?? '');





























    const [usuarioId, setUsuarioId] = useState<number | null>(() => {
        const usuarioGuardado = localStorage.getItem('usuarioId');
        return usuarioGuardado ? Number(usuarioGuardado) : null;
    });
    const [sesionIniciada, setSesionIniciada] = useState(() => Boolean(localStorage.getItem('token')));

    function manejarLogin(nombreUsuario: string, token: string, id: number) {
        localStorage.setItem('token', token);
        localStorage.setItem('usuarioId', String(id));
        localStorage.setItem('usuarioNombre', nombreUsuario);
        setNombre(nombreUsuario);
        setUsuarioId(id);
        setSesionIniciada(true);
    }

    const cerrarSesion = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioId');
        localStorage.removeItem('usuarioNombre');
        setSesionIniciada(false);
        setNombre('');
        setUsuarioId(null);
    };

    return sesionIniciada
        ? <DashboardPage nombreUsuario={nombre} usuarioId={usuarioId} onLogout={cerrarSesion} />
        : <AuthForm onLogin={manejarLogin} />;
}

export default App;