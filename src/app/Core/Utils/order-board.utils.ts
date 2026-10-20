// ==================================================
// Tablero de despachos: filtros y paginación en el cliente
// ==================================================
// La API entrega el día completo (sin paginar), así que buscar, filtrar y paginar se
// hace aquí. Son funciones puras (reciben `now`) para poder probarlas sin el reloj.

import { OrderSummary } from '@core/Models/CoreModule/order.model';
import { OrderState } from '@core/Models/Shared/api-types.model';
import { computeDeliveryStatus } from './delivery-status.utils';

export const BOARD_PAGE_SIZE = 8;

// Valor de un filtro "Estado" del tablero. Es más fino que `OrderState`: un pedido
// PENDING se reparte en pending / soon / late según su hora estimada.
export type BoardStatusKey = 'pending' | 'soon' | 'late' | 'cancelled' | 'dispatched' | 'delivered';

export interface BoardFilters {
	search: string;
	zone: string; // nombre de la zona; '' = todas
	status: string; // BoardStatusKey; '' = todos
	driver: string; // driver_code; '' = todos
}

// Valor del filtro "Domiciliario" para los pedidos que aún no tienen uno asignado
export const NO_DRIVER = '__none__';

export const EMPTY_BOARD_FILTERS: BoardFilters = { search: '', zone: '', status: '', driver: '' };

export const BOARD_STATUS_LABELS: Record<BoardStatusKey, string> = {
	pending: 'Pendiente',
	soon: 'Próximo',
	late: 'Retrasado',
	cancelled: 'Cancelado',
	dispatched: 'Despachado',
	delivered: 'Entregado',
};

// Estados que pueden aparecer en cada pestaña (según lo que devuelve cada endpoint)
export const PENDING_TAB_STATUSES: readonly BoardStatusKey[] = ['pending', 'soon', 'late', 'cancelled'];
export const DISPATCHED_TAB_STATUSES: readonly BoardStatusKey[] = ['dispatched', 'delivered'];

// Minúsculas y sin tildes: "Peña" coincide con "pena"
export function normalizeText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();
}

export function boardStatusKey(row: OrderSummary, now: Date): BoardStatusKey {
	switch (row.state) {
		case OrderState.DISPATCHED:
			return 'dispatched';
		case OrderState.DELIVERED:
			return 'delivered';
		case OrderState.CANCELLED:
			return 'cancelled';
		default: {
			const { tone } = computeDeliveryStatus(row.state, row.estimated_delivery, now);
			return tone === 'soon' || tone === 'late' ? tone : 'pending';
		}
	}
}

// Busca por consecutivo del día ("001"), N.° de pedido (id) o nombre del cliente
function matchesSearch(row: OrderSummary, search: string): boolean {
	const needle = normalizeText(search);
	if (!needle) return true;
	return (
		normalizeText(row.purchase_order).includes(needle) ||
		String(row.id_order).includes(needle) ||
		normalizeText(row.client_name).includes(needle)
	);
}

function matchesDriver(row: OrderSummary, driver: string): boolean {
	if (!driver) return true;
	return driver === NO_DRIVER ? !row.driver_code : row.driver_code === driver;
}

export function filterOrders(rows: readonly OrderSummary[], filters: BoardFilters, now: Date): OrderSummary[] {
	return rows.filter(
		(row) =>
			matchesSearch(row, filters.search) &&
			(!filters.zone || row.zone_name === filters.zone) &&
			matchesDriver(row, filters.driver) &&
			(!filters.status || boardStatusKey(row, now) === filters.status)
	);
}

// Zonas distintas presentes en las filas, ordenadas A-Z
export function zoneOptions(rows: readonly OrderSummary[]): { value: string; label: string }[] {
	const zones = [...new Set(rows.map((row) => row.zone_name).filter(Boolean))];
	return zones.sort((a, b) => a.localeCompare(b, 'es')).map((zone) => ({ value: zone, label: zone }));
}

// Domiciliarios distintos presentes en las filas, más "Sin asignar" si algún pedido no tiene
export function driverOptions(rows: readonly OrderSummary[]): { value: string; label: string }[] {
	const drivers = new Map<string, string>();
	let unassigned = false;
	for (const row of rows) {
		if (row.driver_code) drivers.set(row.driver_code, row.driver_name || row.driver_code);
		else unassigned = true;
	}
	const options = [...drivers]
		.sort((a, b) => a[1].localeCompare(b[1], 'es'))
		.map(([code, name]) => ({ value: code, label: name }));
	return unassigned ? [{ value: NO_DRIVER, label: 'Sin asignar' }, ...options] : options;
}

export function statusOptions(keys: readonly BoardStatusKey[]): { value: string; label: string }[] {
	return keys.map((key) => ({ value: key, label: BOARD_STATUS_LABELS[key] }));
}

export function totalPages(total: number, pageSize = BOARD_PAGE_SIZE): number {
	return Math.max(1, Math.ceil(total / pageSize));
}

// `page` empieza en 1 y se ajusta al rango válido
export function paginate<T>(rows: readonly T[], page: number, pageSize = BOARD_PAGE_SIZE): T[] {
	const safePage = Math.min(Math.max(page, 1), totalPages(rows.length, pageSize));
	return rows.slice((safePage - 1) * pageSize, safePage * pageSize);
}
