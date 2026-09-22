import { useState, type FormEvent } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../api';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const eventosPrueba = [
    {
        title: 'Asamblea de Vecinos',
        start: new Date(2026, 8, 16, 18, 0),
        end: new Date(2026, 8, 16, 20, 0),
    },
    {
        title: 'Reunion Directiva',
        start: new Date(2026, 8, 18, 10, 0),
        end: new Date(2026, 8, 18, 11, 30),
    }
];

export default function PanelPrincipal({ nombreUsuario, onLogout }: { nombreUsuario: string, onLogout: () => void }) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [crearGrupoAbierto, setCrearGrupoAbierto] = useState(false);
    const [nombreGrupo, setNombreGrupo] = useState('');
    const [codigoGrupo, setCodigoGrupo] = useState('');
    const [mensajeGrupo, setMensajeGrupo] = useState('');

    function abrirCrearGrupo() {
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const codigo = Array.from({ length: 5 }, () => caracteres[Math.floor(Math.random() * caracteres.length)]).join('');
        setCodigoGrupo(codigo);
        setMensajeGrupo('');
        setCrearGrupoAbierto(true);
    }

    function cerrarCrearGrupo() {
        setCrearGrupoAbierto(false);
        setNombreGrupo('');
        setCodigoGrupo('');
        setMensajeGrupo('');
    }

    async function guardarGrupo(evento: FormEvent) {
        evento.preventDefault();

        try {
            await api.post('/grupos', { nombre: nombreGrupo, codigo_acceso: codigoGrupo });
            setMensajeGrupo('Grupo guardado correctamente.');
            setNombreGrupo('');
        } catch (error: any) {
            setMensajeGrupo(error.response?.data?.error || 'No se pudo guardar el grupo.');
        }
    }

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif' }}>
            <div style={{ width: '280px', backgroundColor: '#2C3E50', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ borderBottom: '1px solid #455A64', paddingBottom: '15px' }}>Agenda Comunitaria</h2>
                <p>👤 Hola, {nombreUsuario}</p>

                <div style={{ marginTop: '30px' }}>
                    <button onClick={() => setMenuAbierto(!menuAbierto)} style={{ width: '100%', padding: '12px', backgroundColor: '#34495E', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>
                        ⚙️ Gestión de Grupos {menuAbierto ? '▴' : '▾'}
                    </button>
                    {menuAbierto && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', paddingLeft: '15px' }}>
                            <button onClick={abrirCrearGrupo} style={{ padding: '8px', background: 'transparent', color: '#ECF0F1', border: '1px solid #7F8C8D', borderRadius: '4px', cursor: 'pointer' }}>➕ Crear nuevo grupo</button>
                            <button style={{ padding: '8px', background: 'transparent', color: '#ECF0F1', border: '1px solid #7F8C8D', borderRadius: '4px', cursor: 'pointer' }}>🔗 Unirme a un grupo</button>
                        </div>
                    )}
                </div>

                {crearGrupoAbierto && (
                    <form onSubmit={guardarGrupo} style={{ marginTop: '20px', padding: '15px', backgroundColor: '#34495E', borderRadius: '5px' }}>
                        <h3 style={{ marginTop: 0 }}>Crear grupo</h3>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            Nombre del grupo
                            <input type="text" value={nombreGrupo} onChange={(evento) => setNombreGrupo(evento.target.value)} placeholder="Ej: Junta de vecinos" style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
                        </label>
                        <p style={{ marginBottom: '5px' }}>Código de acceso</p>
                        <strong style={{ display: 'block', padding: '10px', backgroundColor: '#ECF0F1', color: '#2C3E50', textAlign: 'center', letterSpacing: '4px' }}>{codigoGrupo}</strong>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button type="submit" disabled={!nombreGrupo.trim()} style={{ flex: 1, padding: '8px', cursor: 'pointer' }}>Guardar</button>
                            <button type="button" onClick={cerrarCrearGrupo} style={{ padding: '8px', cursor: 'pointer' }}>Cerrar</button>
                        </div>
                        <p style={{ marginBottom: 0, color: mensajeGrupo.includes('correctamente') ? '#A9DFBF' : '#F5B7B1' }}>{mensajeGrupo}</p>
                    </form>
                )}

                <div style={{ marginTop: 'auto' }}>
                    <button onClick={onLogout} style={{ width: '100%', padding: '10px', backgroundColor: '#E74C3C', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🚪 Cerrar Sesión</button>
                </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#ECF0F1', padding: '30px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ backgroundColor: 'white', flex: 1, borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '20px' }}>
                    <Calendar
                        localizer={localizer}
                        events={eventosPrueba}
                        startAccessor="start"
                        endAccessor="end"
                        culture="es"
                        messages={{ next: "Siguiente", previous: "Anterior", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda" }}
                        style={{ height: '100%' }}
                    />
                </div>
            </div>
        </div>
    );
}