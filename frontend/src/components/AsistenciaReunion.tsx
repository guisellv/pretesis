import { useEffect, useState } from 'react';
import {
    confirmarAsistencia,
    obtenerAsistencia,
    type AsistenciaIntegrante,
    type EstadoAsistencia,
    type ReunionConGrupo,
} from '../services/meetings.service';
import { mensajeError } from '../helpers/formato';

type AsistenciaReunionProps = {
    reunion: ReunionConGrupo;
    onCambio: (estado: EstadoAsistencia, confirmados: number) => void;
};

export const TEXTO_ASISTENCIA: Record<EstadoAsistencia | 'pendiente', string> = {
    asistire: 'Asistirá',
    no_asistire: 'No asistirá',
    pendiente: 'Sin responder',
};

// Confirmación de asistencia dentro del detalle de una reunión: el usuario responde
// y ve cuántos (y quiénes) del grupo asistirán.
export function AsistenciaReunion({ reunion, onCambio }: AsistenciaReunionProps) {
    const [integrantes, setIntegrantes] = useState<AsistenciaIntegrante[] | null>(null);
    const [miEstado, setMiEstado] = useState<EstadoAsistencia | null>(reunion.mi_asistencia);
    const [guardando, setGuardando] = useState(false);
    const [verLista, setVerLista] = useState(false);
    const [error, setError] = useState('');
    const yaComenzo = new Date(reunion.fecha_inicio).getTime() < Date.now();

    useEffect(() => {
        let cancelado = false;

        obtenerAsistencia(reunion.id)
            .then((lista) => {
                if (!cancelado) setIntegrantes(lista);
            })
            .catch(() => {
                if (!cancelado) setError('No se pudo cargar la asistencia.');
            });

        return () => {
            cancelado = true;
        };
    }, [reunion.id]);

    const responder = async (estado: EstadoAsistencia) => {
        if (estado === miEstado) return;

        setGuardando(true);
        setError('');

        try {
            const lista = await confirmarAsistencia(reunion.id, estado);
            setIntegrantes(lista);
            setMiEstado(estado);
            onCambio(estado, lista.filter((integrante) => integrante.estado === 'asistire').length);
        } catch (errorDesconocido: unknown) {
            setError(mensajeError(errorDesconocido, 'No se pudo guardar tu asistencia.'));
        } finally {
            setGuardando(false);
        }
    };

    const contar = (estado: EstadoAsistencia | null) => integrantes?.filter((integrante) => integrante.estado === estado).length ?? 0;

    return (
        <section className="attendance-card">
            <div className="attendance-head">
                <strong>Asistencia</strong>
                {integrantes && (
                    <span className="attendance-summary">
                        <span className="attendance-badge is-asistire">{contar('asistire')} asistirán</span>
                        <span className="attendance-badge is-no_asistire">{contar('no_asistire')} no</span>
                        <span className="attendance-badge is-pendiente">{contar(null)} sin responder</span>
                    </span>
                )}
            </div>

            {yaComenzo ? (
                <p className="attendance-note">
                    La reunión ya comenzó, la asistencia no se puede cambiar.
                    {' '}Tu respuesta: <strong>{miEstado === 'asistire' ? 'Asistiré' : miEstado === 'no_asistire' ? 'No asistiré' : 'Sin responder'}</strong>
                </p>
            ) : (
                <div className="attendance-options" role="group" aria-label="¿Vas a asistir?">
                    <span>¿Vas a asistir?</span>
                    <button
                        type="button"
                        className={`attendance-option is-yes${miEstado === 'asistire' ? ' is-selected' : ''}`}
                        aria-pressed={miEstado === 'asistire'}
                        disabled={guardando}
                        onClick={() => responder('asistire')}
                    >
                        ✓ Asistiré
                    </button>
                    <button
                        type="button"
                        className={`attendance-option is-no${miEstado === 'no_asistire' ? ' is-selected' : ''}`}
                        aria-pressed={miEstado === 'no_asistire'}
                        disabled={guardando}
                        onClick={() => responder('no_asistire')}
                    >
                        ✕ No asistiré
                    </button>
                </div>
            )}

            {integrantes && integrantes.length > 0 && (
                <button type="button" className="link-button attendance-toggle" onClick={() => setVerLista(!verLista)}>
                    {verLista ? 'Ocultar lista' : 'Ver respuesta de cada integrante'}
                </button>
            )}

            {verLista && integrantes && (
                <ul className="detail-list">
                    {integrantes.map((integrante) => (
                        <li key={integrante.id}>
                            <span>{integrante.nombre}</span>
                            <span className={`attendance-badge is-${integrante.estado ?? 'pendiente'}`}>
                                {TEXTO_ASISTENCIA[integrante.estado ?? 'pendiente']}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {error && <p className="form-error">{error}</p>}
        </section>
    );
}
