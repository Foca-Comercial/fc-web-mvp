// ==================================================
// Panel de administración: filtros compartidos (lógica pura)
// ==================================================
// Lo que se repite en las subsecciones (clientes, productos, domiciliarios…): el filtro
// de estado activo / inactivo y la traducción entre los <select> (texto) y los filtros
// de la API.

// Opción de <app-filter-select> (misma forma que su FilterOption)
export interface Option {
	value: string;
	label: string;
}

// '' = todos (la opción "todas" de <app-filter-select>)
export const STATUS_FILTER_OPTIONS: readonly Option[] = [
	{ value: 'true', label: 'Activos' },
	{ value: 'false', label: 'Inactivos' },
];

export function activeToOption(active: boolean | null): string {
	return active === null ? '' : String(active);
}

export function optionToActive(value: string): boolean | null {
	return value === '' ? null : value === 'true';
}

// Para filtros por id (zona, ruta…): '' = todos
export function idToOption(id: number | null): string {
	return id === null ? '' : String(id);
}

export function optionToId(value: string): number | null {
	return value === '' ? null : Number(value);
}
