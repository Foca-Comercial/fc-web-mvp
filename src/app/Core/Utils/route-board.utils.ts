// ==================================================
// Rutas del día: estado, filtros y formato de las cards
// ==================================================
// La API entrega las rutas del día (/orders/routes-of-day) sin los nombres ni las zonas
// de sus clientes; esos llegan aparte (/routes/{id}/clients) y se juntan en `RouteDayCard`.
// Buscar y filtrar se hace aquí, con funciones puras.

import { RouteOfDay } from '@core/Models/CoreModule/order.model';
import { RouteClient } from '@core/Models/ParametersModule/parameters.model';
import { normalizeText } from './order-board.utils';

// Una ruta queda "Agregada" cuando ya se generaron sus pedidos del día (pasan al
// tablero de despachos, la vista principal)
export type RouteDayStatus = 'pending' | 'added';

export const ROUTE_STATUS_LABELS: Record<RouteDayStatus, string> = {
	pending: 'Por agregar',
	added: 'Agregado',
};

export interface RouteDayCard {
	route: RouteOfDay;
	status: RouteDayStatus;
	clients: RouteClient[]; // solo los clientes activos
	clientNames: string; // "Transporte MASA, Constructora Alpha, …"
	zones: string[]; // zonas distintas de sus clientes
}

export interface RouteFilters {
	search: string;
	zone: string; // nombre de la zona; '' = todas
	status: string; // RouteDayStatus; '' = todos
}

export const EMPTY_ROUTE_FILTERS: RouteFilters = { search: '', zone: '', status: '' };

export function routeDayStatus(route: RouteOfDay): RouteDayStatus {
	return route.orders_count > 0 ? 'added' : 'pending';
}

export function buildRouteCard(route: RouteOfDay, clients: readonly RouteClient[]): RouteDayCard {
	const active = clients.filter((client) => client.active);
	return {
		route,
		status: routeDayStatus(route),
		clients: active,
		clientNames: active.map((client) => client.name).join(', '),
		zones: [...new Set(active.map((client) => client.zone_name).filter(Boolean))],
	};
}

// Busca por nombre de la ruta o de cualquiera de sus clientes
function matchesSearch(card: RouteDayCard, search: string): boolean {
	const needle = normalizeText(search);
	if (!needle) return true;
	return normalizeText(card.route.name).includes(needle) || normalizeText(card.clientNames).includes(needle);
}

export function filterRoutes(cards: readonly RouteDayCard[], filters: RouteFilters): RouteDayCard[] {
	return cards.filter(
		(card) =>
			matchesSearch(card, filters.search) &&
			(!filters.zone || card.zones.includes(filters.zone)) &&
			(!filters.status || card.status === filters.status)
	);
}

// Zonas distintas de todas las rutas, ordenadas A-Z
export function routeZoneOptions(cards: readonly RouteDayCard[]): { value: string; label: string }[] {
	const zones = [...new Set(cards.flatMap((card) => card.zones))];
	return zones.sort((a, b) => a.localeCompare(b, 'es')).map((zone) => ({ value: zone, label: zone }));
}

export function routeStatusOptions(): { value: string; label: string }[] {
	return (Object.keys(ROUTE_STATUS_LABELS) as RouteDayStatus[]).map((key) => ({ value: key, label: ROUTE_STATUS_LABELS[key] }));
}

// Hora de la API ("07:00:00") como en las cards del diseño: "07:00 AM"
export function formatDepartureTime(value: string | null | undefined): string {
	if (!value) return '';
	const [hours, minutes] = value.split(':').map(Number);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
	const hour12 = hours % 12 || 12;
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(hour12)}:${pad(minutes)} ${hours < 12 ? 'AM' : 'PM'}`;
}
