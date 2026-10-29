// ==================================================
// Panel de administración · Clientes (lógica pura)
// ==================================================
// La API pagina y filtra (GET /clients/admin); aquí solo se traducen los filtros de la
// pantalla, se valida el formulario y se arma lo que se envía.
// El formulario reutiliza el borrador y las reglas del cliente nuevo del pedido
// (new-order.utils): nombre obligatorio, teléfono de 10 dígitos, dirección y barrio.

import { ClientAdminCreate, ClientAdminFilters, ClientAdminRow, ClientAdminUpdate } from '@core/Models/CoreModule/catalog.model';
import { NeighborhoodDropdown } from '@core/Models/ParametersModule/parameters.model';
import { Option, STATUS_FILTER_OPTIONS, idToOption, optionToId } from './admin-filters.utils';
import { EMPTY_NEW_CLIENT, NewClientDraft, toNewClientInput } from './new-order.utils';
import { normalizeText } from './text.utils';

// ----- Filtros -----
// Estado y traducción de los <select>: compartidos con las demás subsecciones
export { activeToOption, optionToActive } from './admin-filters.utils';
export type { Option } from './admin-filters.utils';

// Por defecto se ven los activos; los inactivos se buscan con el filtro de estado
export const DEFAULT_CLIENT_FILTERS: ClientAdminFilters = { search: '', active: true, id_zone: null };

export const CLIENT_STATUS_OPTIONS = STATUS_FILTER_OPTIONS;

export function zoneToOption(idZone: number | null): string {
	return idToOption(idZone);
}

export function optionToZone(value: string): number | null {
	return optionToId(value);
}

// Zonas (sin repetir, A-Z) a partir del selector de barrios, que ya trae su zona
export function zoneFilterOptions(neighborhoods: readonly NeighborhoodDropdown[]): Option[] {
	const zones = new Map<number, string>();
	for (const neighborhood of neighborhoods) zones.set(neighborhood.id_zone, neighborhood.zone_name);
	return [...zones]
		.sort(([, a], [, b]) => normalizeText(a).localeCompare(normalizeText(b)))
		.map(([id, name]) => ({ value: String(id), label: name }));
}

// ¿Hay algo distinto de los filtros por defecto? (para ofrecer "Limpiar filtros")
export function hasCustomFilters(filters: ClientAdminFilters): boolean {
	return (
		filters.search !== DEFAULT_CLIENT_FILTERS.search ||
		filters.active !== DEFAULT_CLIENT_FILTERS.active ||
		filters.id_zone !== DEFAULT_CLIENT_FILTERS.id_zone
	);
}

// ----- Formulario (crear / editar) -----
export function draftFromClient(client: ClientAdminRow | null): NewClientDraft {
	if (!client) return { ...EMPTY_NEW_CLIENT };
	return {
		name: client.name,
		phone: client.phone ?? '',
		address: client.address ?? '',
		idNeighborhood: client.id_neighborhood,
	};
}

export function toClientAdminCreate(draft: NewClientDraft): ClientAdminCreate {
	return toNewClientInput(draft);
}

// Solo lo que cambió (PATCH parcial). La API guarda nombre y dirección en mayúsculas,
// así que se comparan igual que quedarán guardados.
export function clientChanges(client: ClientAdminRow, draft: NewClientDraft): ClientAdminUpdate {
	const next = toNewClientInput(draft);
	const changes: ClientAdminUpdate = {};
	if (next.name.toUpperCase() !== client.name) changes.name = next.name;
	if ((next.phone ?? null) !== client.phone) changes.phone = next.phone ?? null;
	if ((next.address?.toUpperCase() ?? null) !== client.address) changes.address = next.address ?? null;
	if (next.id_neighborhood !== client.id_neighborhood) changes.id_neighborhood = next.id_neighborhood;
	return changes;
}

export function hasChanges(changes: ClientAdminUpdate): boolean {
	return Object.keys(changes).length > 0;
}

// Barrios del selector. Si el barrio actual del cliente ya no está activo, no viene en el
// selector: se agrega para que el formulario lo muestre (y se pueda cambiar por otro).
export function neighborhoodChoices(
	list: readonly NeighborhoodDropdown[],
	client: ClientAdminRow | null
): NeighborhoodDropdown[] {
	if (!client || list.some((n) => n.id_neighborhood === client.id_neighborhood)) return [...list];
	return [
		{
			id_neighborhood: client.id_neighborhood,
			name: `${client.neighborhood_name} (inactivo)`,
			id_zone: client.id_zone,
			zone_name: client.zone_name,
		},
		...list,
	];
}

// ----- Textos -----
// "2 productos · 1 ruta"
export function clientLinksSummary(client: Pick<ClientAdminRow, 'special_prices_count' | 'routes_count'>): string {
	const prices = client.special_prices_count;
	const routes = client.routes_count;
	return `${prices} ${prices === 1 ? 'precio especial' : 'precios especiales'} · ${routes} ${routes === 1 ? 'ruta' : 'rutas'}`;
}
