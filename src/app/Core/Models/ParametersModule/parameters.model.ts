// ==================================================
// Modelos: ParametersModule (Zone, Neighborhood, Route, Vehicle)
// ==================================================
// Espejo de app/schemas/parametersModule.

import { TimeString } from '../Shared/api-types.model';

// ----- Zone -----
export interface ZoneCreate {
	name: string; // máx. 50
	commune_code: string; // máx. 3
	active?: boolean;
}
export type ZoneUpdate = Partial<ZoneCreate>;
export interface Zone extends Required<ZoneCreate> {
	id_zone: number;
}

// ----- Neighborhood -----
export interface NeighborhoodCreate {
	name: string; // máx. 50
	id_zone: number;
	active?: boolean;
}
export type NeighborhoodUpdate = Partial<NeighborhoodCreate>;
export interface Neighborhood extends Required<NeighborhoodCreate> {
	id_neighborhood: number;
}

// Selector de barrio del formulario de pedido (cliente nuevo)
export interface NeighborhoodDropdown {
	id_neighborhood: number;
	name: string;
	id_zone: number;
	zone_name: string;
}

// ----- Route -----
export interface RouteCreate {
	name: string; // máx. 50
	days_week: number[]; // 1 = lunes ... 7 = domingo, al menos uno
	departure_time: TimeString; // "HH:MM" o "HH:MM:SS"
	active?: boolean;
}
export type RouteUpdate = Partial<RouteCreate>;
export interface Route extends Required<RouteCreate> {
	id_route: number;
}

// Vista de Rutas: GET /routes/cards
export interface RouteCard extends Route {
	clients_count: number; // clientes activos asignados
	client_names: string[]; // nombres de esos clientes, A-Z
	zones: string[]; // zonas distintas de esos clientes, A-Z
}

// POST /routes/{id}/clients
export interface RouteClientAssign {
	id_client: number;
}

// GET /routes/{id}/available-clients
export interface RouteAvailableClient {
	id_client: number;
	name: string;
	phone: string | null;
	address: string | null;
	neighborhood_name: string;
	zone_name: string;
}

// GET /routes/{id}/clients
export interface RouteClient extends RouteAvailableClient {
	id_client_route: number;
	active: boolean; // estado del cliente
}

// ----- Vehicle -----
export interface VehicleCreate {
	name: string; // máx. 50
	active?: boolean;
}
export type VehicleUpdate = Partial<VehicleCreate>;
export interface Vehicle extends Required<VehicleCreate> {
	id_vehicle: number;
}

// Panel de administración (/vehicles/admin). Crear usa VehicleCreate y editar
// VehicleUpdate (PATCH parcial; { active: false } desactiva, { active: true } reactiva).
export interface VehicleAdminFilters {
	search: string; // nombre (contiene); '' = sin filtro
	active: boolean | null; // null = activos e inactivos
}

export interface VehicleAdminRow {
	id_vehicle: number;
	name: string;
	active: boolean;
	assignments_count: number; // asignaciones activas (domiciliario + código) con este vehículo
}
