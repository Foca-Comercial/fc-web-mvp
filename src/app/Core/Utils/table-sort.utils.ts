// ==================================================
// Orden de las tablas paginadas en el servidor (lógica pura)
// ==================================================
// La API ordena en SQL con `sort_by` (campo) y `sort_dir` (asc | desc). Aquí vive lo que
// comparten todas las tablas con ServerTable: el estado de orden, cómo cambia con cada clic
// en un encabezado y cómo se traduce a query params. El componente <th app-sort-header> y
// ServerTable solo cablean estas funciones.
//
// La `key` de un orden ES el nombre del campo que la API acepta en `sort_by`
// (p. ej. 'client_name'); así no hay una tabla de equivalencias que mantener.

import { BoardSort, SortDirection, nextSort } from './order-board.utils';

export type TableSort = BoardSort<string>;

// Los query params que se agregan a la petición cuando hay un orden
export interface SortRequest {
	sort_by?: string;
	sort_dir?: SortDirection;
}

export function toSortRequest(sort: TableSort | null): SortRequest {
	return sort ? { sort_by: sort.key, sort_dir: sort.direction } : {};
}

// Cada clic recorre: ascendente → descendente → orden por defecto de la tabla (`fallback`;
// null = el de la API). Con la columna por defecto ya activa, alterna ascendente ↔ descendente.
export function nextTableSort(current: TableSort | null, key: string, fallback: TableSort | null = null): TableSort | null {
	return nextSort(current, key) ?? fallback;
}

export type SortState = 'ascending' | 'descending' | 'none';
export type SortIcon = 'chevron-up' | 'chevron-down' | 'chevron-up-down';

export function sortState(sort: TableSort | null, key: string): SortState {
	if (sort?.key !== key) return 'none';
	return sort.direction === 'asc' ? 'ascending' : 'descending';
}

export function sortIcon(sort: TableSort | null, key: string): SortIcon {
	const state = sortState(sort, key);
	return state === 'ascending' ? 'chevron-up' : state === 'descending' ? 'chevron-down' : 'chevron-up-down';
}
