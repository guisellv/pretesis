import type { ReactNode } from 'react';

type FiltrosTablaProps = {
    busqueda: string;
    onBusqueda: (valor: string) => void;
    placeholder: string;
    total: number; // filas sin filtrar
    visibles: number; // filas que quedan con los filtros
    hayFiltros: boolean;
    onLimpiar: () => void;
    children?: ReactNode; // selects extra (FiltroSelect)
};

// Barra de búsqueda y filtros que va arriba de cada tabla
export function FiltrosTabla({
    busqueda,
    onBusqueda,
    placeholder,
    total,
    visibles,
    hayFiltros,
    onLimpiar,
    children,
}: FiltrosTablaProps) {
    return (
        <div className="table-filters">
            <label className="table-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                    type="search"
                    value={busqueda}
                    onChange={(evento) => onBusqueda(evento.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                />
            </label>

            {children}

            <div className="table-filters-info">
                {hayFiltros && (
                    <>
                        <span>Mostrando {visibles} de {total}</span>
                        <button type="button" className="link-button" onClick={onLimpiar}>Limpiar filtros</button>
                    </>
                )}
            </div>
        </div>
    );
}

type FiltroSelectProps<T extends string> = {
    etiqueta: string;
    valor: T;
    opciones: { valor: T; texto: string }[];
    onCambiar: (valor: T) => void;
};

export function FiltroSelect<T extends string>({ etiqueta, valor, opciones, onCambiar }: FiltroSelectProps<T>) {
    return (
        <label className="table-filter-select">
            <span>{etiqueta}</span>
            <select value={valor} onChange={(evento) => onCambiar(evento.target.value as T)}>
                {opciones.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
                ))}
            </select>
        </label>
    );
}
