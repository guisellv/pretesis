import type { ReactNode } from 'react';

type ModalProps = {
    titulo: ReactNode;
    subtitulo?: ReactNode;
    onCerrar: () => void;
    acciones?: ReactNode;
    ancho?: 'normal' | 'medio' | 'ancho';
    children: ReactNode;
};

// Ventana emergente con encabezado (título y ×), contenido con scroll y fila de botones abajo
export function Modal({ titulo, subtitulo, onCerrar, acciones, ancho = 'normal', children }: ModalProps) {
    return (
        <div className="modal-overlay">
            <div className={`modal-box modal-${ancho}`} role="dialog" aria-modal="true">
                <div className="modal-header">
                    <div>
                        <h3>{titulo}</h3>
                        {subtitulo && <p className="modal-subtitle">{subtitulo}</p>}
                    </div>
                    <button type="button" className="modal-close" aria-label="Cerrar" onClick={onCerrar}>×</button>
                </div>

                <div className="modal-body">{children}</div>

                {acciones && <div className="modal-actions">{acciones}</div>}
            </div>
        </div>
    );
}

type ConfirmModalProps = {
    titulo: string;
    mensaje: ReactNode;
    textoConfirmar: string;
    textoProcesando?: string;
    procesando?: boolean;
    error?: string;
    onConfirmar: () => void;
    onCerrar: () => void;
};

// Confirmación antes de una acción que no se puede deshacer (eliminar, salir de un grupo)
export function ConfirmModal({
    titulo,
    mensaje,
    textoConfirmar,
    textoProcesando = 'Eliminando...',
    procesando,
    error,
    onConfirmar,
    onCerrar,
}: ConfirmModalProps) {
    return (
        <Modal
            titulo={titulo}
            onCerrar={onCerrar}
            acciones={(
                <>
                    <button type="button" className="secondary-button" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="button" className="danger-solid-button" onClick={onConfirmar} disabled={procesando}>
                        {procesando ? textoProcesando : textoConfirmar}
                    </button>
                </>
            )}
        >
            <div className="confirm-message">{mensaje}</div>
            {error && <p className="form-error">{error}</p>}
        </Modal>
    );
}
