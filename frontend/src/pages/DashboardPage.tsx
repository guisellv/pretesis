import { useEffect, useState } from 'react';
import { Calendar } from '../components/Calendar';
import Panellateral from '../components/Panellateral';
import { listarGrupos, type Grupo } from '../services/groups.service';

type DashboardPageProps = {
    nombreUsuario: string;
    usuarioId: number | null;
    onLogout: () => void;
};

export default function DashboardPage({ nombreUsuario, usuarioId, onLogout }: DashboardPageProps) {
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);

    useEffect(() => {
        if (usuarioId === null) {
            setGrupos([]);
            setGrupoSeleccionado(null);
            return;
        }

        listarGrupos(usuarioId)
            .then((gruposGuardados) => {
                setGrupos(gruposGuardados);
                setGrupoSeleccionado(null);
            })
            .catch(() => {
                setGrupos([]);
                setGrupoSeleccionado(null);
            });
    }, [usuarioId]);

    const agregarGrupo = (grupo: Grupo) => {
        setGrupos((gruposActuales) => [...gruposActuales, grupo]);
        setGrupoSeleccionado(grupo);
    };

    return (
        <div className="panel-page">
            <Panellateral
                nombreUsuario={nombreUsuario}
                usuarioId={usuarioId}
                onLogout={onLogout}
                grupos={grupos}
                grupoSeleccionadoId={grupoSeleccionado?.id ?? null}
                onGrupoCreado={agregarGrupo}
                onInicio={() => setGrupoSeleccionado(null)}
                onSeleccionarGrupo={setGrupoSeleccionado}
            />
            <main className="panel-main">
                <div className="calendar-frame">
                    <Calendar
                        nombreGrupo={grupoSeleccionado?.nombre}
                        codigoGrupo={grupoSeleccionado?.codigo_acceso}
                        esAdministrador={grupoSeleccionado?.rol?.toLowerCase() === 'administrador'}
                        grupoId={grupoSeleccionado?.id ?? null}
                        usuarioId={usuarioId}
                    />
                </div>
            </main>
        </div>
    );
}