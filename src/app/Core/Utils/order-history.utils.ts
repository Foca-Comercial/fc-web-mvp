// ==================================================
// Vista Histórico de pedidos (lógica pura)
// ==================================================
// La API filtra y pagina (GET /orders/history); aquí se arman los filtros de la pantalla,
// las opciones de los <select> y el color de cada estado. Las fechas son días de entrega
// ("AAAA-MM-DD", calendario de Bogotá).

import { DriverVehicleDropdown } from '@core/Models/CoreModule/catalog.model';
import { IsoDate, ORDER_STATE_LABELS, OrderState } from '@core/Models/Shared/api-types.model';
import type { BadgeTone } from '@components/Shared/status-badge/status-badge.component';
import { Option } from './admin-filters.utils';

// Mismos nombres que los query params de la API: van directo a OrderService.getHistory
export interface HistoryFilters {
	search: string; // nombre del cliente o consecutivo (PO) exacto
	state: OrderState | null;
	id_user_vehicle: number | null;
	date_from: IsoDate;
	date_to: IsoDate;
}

// Por defecto, el mismo rango que usa la API: del 1 del mes anterior a hoy
export function defaultHistoryFilters(today: IsoDate): HistoryFilters {
	return { search: '', state: null, id_user_vehicle: null, date_from: firstDayOfPreviousMonth(today), date_to: today };
}

// "2026-01-20" → "2025-12-01"
export function firstDayOfPreviousMonth(today: IsoDate): IsoDate {
	const [year, month] = today.split('-').map(Number);
	const previousYear = month === 1 ? year - 1 : year;
	const previousMonth = month === 1 ? 12 : month - 1;
	return `${previousYear}-${String(previousMonth).padStart(2, '0')}-01`;
}

// Cambiar una fecha nunca deja el rango al revés: la otra punta se mueve con ella
export function withDateFrom(filters: HistoryFilters, value: IsoDate): HistoryFilters {
	return { ...filters, date_from: value, date_to: value > filters.date_to ? value : filters.date_to };
}

export function withDateTo(filters: HistoryFilters, value: IsoDate): HistoryFilters {
	return { ...filters, date_to: value, date_from: value < filters.date_from ? value : filters.date_from };
}

// ¿Hay algo distinto de los filtros por defecto? (para ofrecer "Limpiar filtros")
export function hasCustomFilters(filters: HistoryFilters, defaults: HistoryFilters): boolean {
	return (Object.keys(defaults) as (keyof HistoryFilters)[]).some((key) => filters[key] !== defaults[key]);
}

// ----- Opciones de los <select> ('' = todos) -----
export const HISTORY_STATE_OPTIONS: readonly Option[] = Object.values(OrderState).map((state) => ({
	value: state,
	label: ORDER_STATE_LABELS[state],
}));

export function stateToOption(state: OrderState | null): string {
	return state ?? '';
}

export function optionToState(value: string): OrderState | null {
	return value === '' ? null : (value as OrderState);
}

// "011 · Juan Beltrán", ordenados por código
export function driverFilterOptions(drivers: readonly DriverVehicleDropdown[]): Option[] {
	return [...drivers]
		.sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }))
		.map((driver) => ({ value: String(driver.id_user_vehicle), label: `${driver.code} · ${driver.driver_name}` }));
}

// ----- Estado de cada fila -----
// Pendiente (ámbar) · Despachado (azul) · Entregado (verde) · Cancelado (rojo)
const STATE_TONES: Record<OrderState, BadgeTone> = {
	[OrderState.PENDING]: 'soon',
	[OrderState.DISPATCHED]: 'pending',
	[OrderState.DELIVERED]: 'done',
	[OrderState.CANCELLED]: 'danger',
};

export function historyStateTone(state: OrderState): BadgeTone {
	return STATE_TONES[state];
}
