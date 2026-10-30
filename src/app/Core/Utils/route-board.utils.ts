// ==================================================
// Rutas del día y de la semana: estado, filtros y formato de las cards
// ==================================================
// La API entrega las rutas (/orders/routes-of-day y /routes/cards) ya con los nombres y las
// zonas de sus clientes, así que no hace falta pedir los clientes ruta por ruta. Buscar,
// filtrar y agrupar se hace aquí, con funciones puras.

import { RouteOfDay } from '@core/Models/CoreModule/order.model';
import { RouteCard } from '@core/Models/ParametersModule/parameters.model';
import { DAY_WEEK_LABELS, DayWeek } from '@core/Models/Shared/api-types.model';
import { normalizeText } from './text.utils';

// Una ruta del día queda "Agregada" cuando ya se generaron sus pedidos del día (pasan al
// tablero de despachos, la vista principal)
export type RouteDayStatus = 'pending' | 'added';

export const ROUTE_STATUS_LABELS: Record<RouteDayStatus, string> = {
	pending: 'Por agregar',
	added: 'Agregado',
};

// Lo que tienen en común las rutas del día y las de /routes/cards
export type RouteBasics = Pick<
	RouteOfDay,
	'id_route' | 'name' | 'departure_time' | 'days_week' | 'clients_count' | 'client_names' | 'zones'
>;

// Datos de una card. `status` es null en las cards informativas (Rutas de la semana):
// sin estado ni acciones.
export interface RouteCardInfo<R extends RouteBasics = RouteBasics> {
	route: R;
	status: RouteDayStatus | null;
	clientNames: string; // "Transporte MASA, Constructora Alpha, …"
	zones: string[]; // zonas distintas de sus clientes
}

// Card de la pestaña Rutas del día: siempre con estado
export interface RouteDayCard extends RouteCardInfo<RouteOfDay> {
	status: RouteDayStatus;
}

export type RouteWeekCard = RouteCardInfo<RouteCard>;

// ¿Es una card de Rutas del día? (las de la semana no tienen estado ni pedidos de hoy)
export function isDayCard(card: RouteCardInfo): card is RouteDayCard {
	return card.status !== null;
}

export interface RouteFilters {
	search: string;
	zone: string; // nombre de la zona; '' = todas
	status: string; // RouteDayStatus; '' = todos (no aplica a las cards informativas)
}

export const EMPTY_ROUTE_FILTERS: RouteFilters = { search: '', zone: '', status: '' };

export function routeDayStatus(route: RouteOfDay): RouteDayStatus {
	return route.orders_count > 0 ? 'added' : 'pending';
}

// Tras crear los pedidos de una ruta: actualiza su conteo y su estado (pasa a "Agregado")
export function markRouteAdded(cards: readonly RouteDayCard[], idRoute: number, created: number): RouteDayCard[] {
	return cards.map((card) => {
		if (card.route.id_route !== idRoute) return card;
		const route = { ...card.route, orders_count: card.route.orders_count + created };
		return { ...card, route, status: routeDayStatus(route) };
	});
}

function clientsInfo(route: RouteBasics): Pick<RouteCardInfo, 'clientNames' | 'zones'> {
	return { clientNames: route.client_names.join(', '), zones: route.zones };
}

export function buildRouteCard(route: RouteOfDay): RouteDayCard {
	return { route, status: routeDayStatus(route), ...clientsInfo(route) };
}

export function buildWeekRouteCard(route: RouteCard): RouteWeekCard {
	return { route, status: null, ...clientsInfo(route) };
}

// Busca por nombre de la ruta o de cualquiera de sus clientes
function matchesSearch(card: RouteCardInfo, search: string): boolean {
	const needle = normalizeText(search);
	if (!needle) return true;
	return normalizeText(card.route.name).includes(needle) || normalizeText(card.clientNames).includes(needle);
}

export function filterRoutes<T extends RouteCardInfo>(cards: readonly T[], filters: RouteFilters): T[] {
	return cards.filter(
		(card) =>
			matchesSearch(card, filters.search) &&
			(!filters.zone || card.zones.includes(filters.zone)) &&
			(!filters.status || card.status === filters.status)
	);
}

// Zonas distintas de todas las rutas, ordenadas A-Z
export function routeZoneOptions(cards: readonly RouteCardInfo[]): { value: string; label: string }[] {
	const zones = [...new Set(cards.flatMap((card) => card.zones))];
	return zones.sort((a, b) => a.localeCompare(b, 'es')).map((zone) => ({ value: zone, label: zone }));
}

export function routeStatusOptions(): { value: string; label: string }[] {
	return (Object.keys(ROUTE_STATUS_LABELS) as RouteDayStatus[]).map((key) => ({ value: key, label: ROUTE_STATUS_LABELS[key] }));
}

// ----- Rutas de la semana -----
export interface RouteWeekDay<T extends RouteCardInfo = RouteCardInfo> {
	day: DayWeek;
	label: string; // "Lunes"
	cards: T[];
}

const WEEK_DAYS: readonly DayWeek[] = [
	DayWeek.MONDAY,
	DayWeek.TUESDAY,
	DayWeek.WEDNESDAY,
	DayWeek.THURSDAY,
	DayWeek.FRIDAY,
	DayWeek.SATURDAY,
	DayWeek.SUNDAY,
];

// Opciones del filtro "Día" (valor = DayWeek como texto: '1' = lunes … '7' = domingo)
export function weekDayOptions(): { value: string; label: string }[] {
	return WEEK_DAYS.map((day) => ({ value: String(day), label: DAY_WEEK_LABELS[day].long }));
}

// Lunes a domingo, cada día con sus rutas por hora de salida. Una ruta que sale varios
// días aparece en cada uno de ellos. Con `onlyDay` ('1' … '7') se deja solo ese día.
export function groupRoutesByDay<T extends RouteCardInfo>(cards: readonly T[], onlyDay = ''): RouteWeekDay<T>[] {
	const byTime = [...cards].sort(
		(a, b) => a.route.departure_time.localeCompare(b.route.departure_time) || a.route.name.localeCompare(b.route.name, 'es')
	);
	const days = onlyDay ? WEEK_DAYS.filter((day) => String(day) === onlyDay) : WEEK_DAYS;
	return days.map((day) => ({
		day,
		label: DAY_WEEK_LABELS[day].long,
		cards: byTime.filter((card) => card.route.days_week.includes(day)),
	}));
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
