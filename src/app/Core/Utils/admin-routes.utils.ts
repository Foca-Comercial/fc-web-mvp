// ==================================================
// Panel de administración · Rutas (lógica pura)
// ==================================================
// La API pagina y filtra (GET /routes/admin). Aquí se valida el formulario (nombre, días y
// hora de salida), se arma lo que se envía y se manejan las listas de clientes de la ruta.

import { DAY_WEEK_LABELS, DayWeek } from '@core/Models/Shared/api-types.model';
import {
	RouteAdminFilters,
	RouteAdminRow,
	RouteAvailableClient,
	RouteClient,
	RouteCreate,
	RouteUpdate,
} from '@core/Models/ParametersModule/parameters.model';
import { toApiTime } from './date.utils';
import { normalizeText } from './text.utils';

export const MAX_ROUTE_NAME_LENGTH = 50;
export const MIN_CLIENT_SEARCH = 2;

export const WEEK_DAYS: readonly DayWeek[] = [
	DayWeek.MONDAY,
	DayWeek.TUESDAY,
	DayWeek.WEDNESDAY,
	DayWeek.THURSDAY,
	DayWeek.FRIDAY,
	DayWeek.SATURDAY,
	DayWeek.SUNDAY,
];

// ----- Filtros -----
export const DEFAULT_ROUTE_FILTERS: RouteAdminFilters = { search: '', active: true, day: null };

export function hasCustomRouteFilters(filters: RouteAdminFilters): boolean {
	return (
		filters.search !== DEFAULT_ROUTE_FILTERS.search ||
		filters.active !== DEFAULT_ROUTE_FILTERS.active ||
		filters.day !== DEFAULT_ROUTE_FILTERS.day
	);
}

// Opciones del filtro "Día" ('1' = lunes … '7' = domingo)
export function dayFilterOptions(): { value: string; label: string }[] {
	return WEEK_DAYS.map((day) => ({ value: String(day), label: DAY_WEEK_LABELS[day].long }));
}

// ----- Formulario (crear / editar) -----
export interface RouteDraft {
	name: string;
	days: number[]; // en orden de la semana, sin repetidos
	time: string; // valor de <input type="time"> ("06:30")
}

export const EMPTY_ROUTE: RouteDraft = { name: '', days: [], time: '' };

export type RouteErrors = Partial<Record<keyof RouteDraft, string>>;

export function draftFromRoute(route: RouteAdminRow | null): RouteDraft {
	if (!route) return { ...EMPTY_ROUTE, days: [] };
	return { name: route.name, days: [...route.days_week].sort((a, b) => a - b), time: route.departure_time.slice(0, 5) };
}

// Marca o desmarca un día; la lista queda en orden de la semana
export function toggleDay(days: readonly number[], day: number): number[] {
	const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
	return next.sort((a, b) => a - b);
}

export function routeErrors(draft: RouteDraft): RouteErrors {
	const errors: RouteErrors = {};
	const name = draft.name.trim();
	if (!name) errors.name = 'Escribe el nombre de la ruta.';
	else if (name.length > MAX_ROUTE_NAME_LENGTH) errors.name = `Máximo ${MAX_ROUTE_NAME_LENGTH} caracteres.`;
	if (draft.days.length === 0) errors.days = 'Elige al menos un día.';
	if (!/^\d{2}:\d{2}$/.test(draft.time)) errors.time = 'Elige la hora de salida.';
	return errors;
}

export function hasRouteErrors(errors: RouteErrors): boolean {
	return Object.keys(errors).length > 0;
}

export function toRouteCreate(draft: RouteDraft): RouteCreate {
	return { name: draft.name.trim(), days_week: [...draft.days], departure_time: toApiTime(draft.time) ?? draft.time };
}

// Solo lo que cambió (PATCH parcial). El nombre se guarda en mayúsculas.
export function routeChanges(route: RouteAdminRow, draft: RouteDraft): RouteUpdate {
	const next = toRouteCreate(draft);
	const changes: RouteUpdate = {};
	if (next.name.toUpperCase() !== route.name) changes.name = next.name;
	const saved = [...route.days_week].sort((a, b) => a - b);
	const sameDays = saved.length === next.days_week.length && saved.every((day, i) => day === next.days_week[i]);
	if (!sameDays) changes.days_week = next.days_week;
	if (draft.time !== route.departure_time.slice(0, 5)) changes.departure_time = next.departure_time;
	return changes;
}

export function hasRouteChanges(changes: RouteUpdate): boolean {
	return Object.keys(changes).length > 0;
}

// ----- Clientes de la ruta -----
// Por nombre, sin importar tildes ni mayúsculas
export function sortRouteClients(clients: readonly RouteClient[]): RouteClient[] {
	return [...clients].sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)));
}

export function removeRouteClient(clients: readonly RouteClient[], idClient: number): RouteClient[] {
	return clients.filter((client) => client.id_client !== idClient);
}

// La API busca a partir de 2 letras; vacío = los primeros por nombre
export function canSearchClients(text: string): boolean {
	const length = text.trim().length;
	return length === 0 || length >= MIN_CLIENT_SEARCH;
}

// Sin productos activos con precio especial: aparece en la plantilla de la ruta, pero no
// se le puede generar pedido desde ella
export function lacksSpecialPrices(client: Pick<RouteAvailableClient, 'special_prices_count'>): boolean {
	return client.special_prices_count === 0;
}

// "12 clientes · 2 sin precios especiales"
export function routeClientsSummary(clients: readonly RouteClient[]): string {
	const active = clients.filter((client) => client.active);
	const withoutPrices = active.filter(lacksSpecialPrices).length;
	const base = `${active.length} ${active.length === 1 ? 'cliente activo' : 'clientes activos'}`;
	return withoutPrices > 0 ? `${base} · ${withoutPrices} sin precios especiales` : base;
}

export function clientsCountText(count: number): string {
	return count === 0 ? 'Ninguno' : `${count} ${count === 1 ? 'cliente' : 'clientes'}`;
}
