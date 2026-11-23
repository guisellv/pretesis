import { useCallback, useEffect, useState } from 'react';
import { Calendar } from '../components/Calendar';
import Panellateral, { type Seccion } from '../components/Panellateral';
import { ReunionModal, type ModoReunion } from '../components/ReunionModal';
import { listarGrupos, type Grupo } from '../services/groups.service';
import { listarMisReuniones, type EstadoAsistencia, type ReunionConGrupo } from '../services/meetings.service';
import { obtenerUsuarioActual } from '../services/users.service';
import { esRolAdministrador, mensajeError } from '../helpers/formato';
import GruposPage from './GruposPage';
import ReunionesPage from './ReunionesPage';
import UsuariosPage from './UsuariosPage';

type DashboardPageProps = {
    nombreUsuario: string;
    usuarioId: number | null;
    onLogout: () => void;
};

type ReunionAbierta = { modo: ModoReunion; reunion: ReunionConGrupo | null; grupoNueva?: Grupo };

export default function DashboardPage({ nombreUsuario, usuarioId, onLogout }: DashboardPageProps) {
    const [seccion, setSeccion] = useState<Seccion>('inicio');
    const [esAdminSistema, setEsAdminSistema] = useState(false);
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [reuniones, setReuniones] = useState<ReunionConGrupo[]>([]);
    const [errorReuniones, setErrorReuniones] = useState('');
    const [reunionAbierta, setReunionAbierta] = useState<ReunionAbierta | null>(null);
    // Grupo elegido en la sección Reuniones (se mantiene al cambiar de sección)
    const [grupoReunionesId, setGrupoReunionesId] = useState<number | null>(null);

    const cargarReuniones = useCallback(() => {
        setErrorReuniones('');
        listarMisReuniones()
            .then(setReuniones)
            .catch((errorDesconocido: unknown) => {
                setReuniones([]);
                setErrorReuniones(mensajeError(
                    errorDesconocido,
                    'No se pudieron cargar las reuniones. Revisa la conexión y vuelve a intentarlo.'
                ));
            });
    }, []);

    useEffect(() => {
        if (usuarioId === null) return;

        listarGrupos(usuarioId).then(setGrupos).catch(() => setGrupos([]));
        cargarReuniones();
        obtenerUsuarioActual()
            .then((usuario) => setEsAdminSistema(usuario.rol === 'admin'))
            .catch(() => setEsAdminSistema(false));
    }, [usuarioId, cargarReuniones]);

    // Si el grupo elegido ya no existe (se eliminó o aún no se elige), se usa el primero
    const grupoReuniones = grupos.find((grupo) => grupo.id === grupoReunionesId) ?? grupos[0] ?? null;

    const abrirReunion = (reunion: ReunionConGrupo, modo: ModoReunion) => setReunionAbierta({ reunion, modo });

    const reunionGuardada = (guardada: ReunionConGrupo) => {
        setReuniones((actuales) => {
            const existe = actuales.some((reunion) => reunion.id === guardada.id);
            const lista = existe
                ? actuales.map((reunion) => (reunion.id === guardada.id ? guardada : reunion))
                : [...actuales, guardada];
            return lista.sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
        });
        setReunionAbierta(null);
        cargarReuniones(); // si cambió la fecha, el backend reinicia las confirmaciones de asistencia
    };

    const asistenciaCambiada = (reunionId: number, estado: EstadoAsistencia, confirmados: number) => {
        setReuniones((actuales) => actuales.map((reunion) => (
            reunion.id === reunionId ? { ...reunion, mi_asistencia: estado, confirmados } : reunion
        )));
    };

    const reunionEliminada = (id: number) => {
        setReuniones((actuales) => actuales.filter((reunion) => reunion.id !== id));
        setReunionAbierta(null);
    };

    return (
        <div className="panel-page">
            <Panellateral
                nombreUsuario={nombreUsuario}
                esAdminSistema={esAdminSistema}
                seccion={seccion}
                onCambiarSeccion={setSeccion}
                onLogout={onLogout}
            />

            <main className="panel-main">
                {seccion === 'inicio' && (
                    <section className="page-card">
                        <header className="page-header">
                            <div>
                                <h1 className="page-title">Calendario de todas las actividades</h1>
                                <p className="page-subtitle">Reuniones de todos tus grupos. Haz clic en una para ver su detalle.</p>
                            </div>
                        </header>
                        {errorReuniones && <p className="form-error" role="alert">{errorReuniones}</p>}
                        <Calendar
                            reuniones={reuniones}
                            onSeleccionar={(reunion) => abrirReunion(reunion, esRolAdministrador(reunion.rol) ? 'editar' : 'ver')}
                        />
                    </section>
                )}

                {seccion === 'grupos' && (
                    <GruposPage
                        grupos={grupos}
                        usuarioId={usuarioId}
                        onAgregado={(grupo) => {
                            setGrupos((actuales) => [...actuales, grupo]);
                            cargarReuniones(); // al unirse a un grupo aparecen sus reuniones
                        }}
                        onActualizado={(grupo) => {
                            setGrupos((actuales) => actuales.map((item) => (item.id === grupo.id ? grupo : item)));
                            cargarReuniones(); // cambia el nombre del grupo en las reuniones
                        }}
                        onEliminado={(grupoId) => {
                            setGrupos((actuales) => actuales.filter((item) => item.id !== grupoId));
                            setReuniones((actuales) => actuales.filter((reunion) => reunion.grupo_id !== grupoId));
                        }}
                    />
                )}

                {seccion === 'reuniones' && usuarioId !== null && (
                    <ReunionesPage
                        grupos={grupos}
                        grupoSeleccionado={grupoReuniones}
                        onSeleccionarGrupo={setGrupoReunionesId}
                        reuniones={reuniones}
                        errorCarga={errorReuniones}
                        usuarioId={usuarioId}
                        onIrAGrupos={() => setSeccion('grupos')}
                        onCrear={(grupo) => setReunionAbierta({ reunion: null, modo: 'crear', grupoNueva: grupo })}
                        onAbrir={abrirReunion}
                        onEliminada={reunionEliminada}
                    />
                )}

                {seccion === 'usuarios' && esAdminSistema && <UsuariosPage usuarioActualId={usuarioId} />}
            </main>

            {reunionAbierta && usuarioId !== null && (
                <ReunionModal
                    key={reunionAbierta.reunion?.id ?? 'nueva'}
                    modo={reunionAbierta.modo}
                    reunion={reunionAbierta.reunion}
                    grupoNueva={reunionAbierta.grupoNueva ?? null}
                    usuarioId={usuarioId}
                    onGuardada={reunionGuardada}
                    onEliminada={reunionEliminada}
                    onAsistenciaCambiada={asistenciaCambiada}
                    onCerrar={() => setReunionAbierta(null)}
                />
            )}
        </div>
    );
}
