// ==================================================
// Nuevo pedido: validación y armado de los bodies (lógica pura)
// ==================================================
// Dos formularios con la misma base (productos, día y hora de entrega, domiciliario):
//   - Cliente existente → POST /orders/existing-client { id_client, … }
//   - Cliente nuevo     → POST /orders/new-client { client: { name, phone, address, id_neighborhood }, … }
// El cliente nuevo se guarda como temporal: no aparece en la búsqueda de clientes registrados.

import { NewClientInput } from '@core/Models/CoreModule/catalog.model';
import { OrderCreateExistingClient, OrderCreateNewClient } from '@core/Models/CoreModule/order.model';
import { NeighborhoodDropdown } from '@core/Models/ParametersModule/parameters.model';
import { toApiTime } from './date.utils';
import { EditorLine, buildNewOrderItems } from './order-items.utils';
import { normalizeText } from './text.utils';

export const MIN_CLIENT_SEARCH_LENGTH = 2;
export const PHONE_DIGITS = 10;
export const MAX_CLIENT_NAME_LENGTH = 200;
export const MAX_CLIENT_ADDRESS_LENGTH = 200;

// La API exige 2 letras como mínimo para buscar clientes
export function canSearchClients(text: string): boolean {
	return text.trim().length >= MIN_CLIENT_SEARCH_LENGTH;
}

// ----- Cliente nuevo -----
export interface NewClientDraft {
	name: string;
	phone: string; // solo dígitos
	address: string;
	idNeighborhood: number | null;
}

export const EMPTY_NEW_CLIENT: NewClientDraft = { name: '', phone: '', address: '', idNeighborhood: null };

export type NewClientField = 'name' | 'phone' | 'address' | 'idNeighborhood';
export type NewClientErrors = Partial<Record<NewClientField, string>>;

// Errores de cada campo (vacío = todo bien). Teléfono y dirección son opcionales.
export function newClientErrors(draft: NewClientDraft): NewClientErrors {
	const errors: NewClientErrors = {};
	const name = draft.name.trim();
	if (!name) errors.name = 'Escribe el nombre del cliente.';
	else if (name.length > MAX_CLIENT_NAME_LENGTH) errors.name = `Máximo ${MAX_CLIENT_NAME_LENGTH} caracteres.`;

	if (draft.phone && draft.phone.length !== PHONE_DIGITS) errors.phone = `El teléfono debe tener ${PHONE_DIGITS} dígitos.`;

	if (draft.address.trim().length > MAX_CLIENT_ADDRESS_LENGTH) errors.address = `Máximo ${MAX_CLIENT_ADDRESS_LENGTH} caracteres.`;

	if (draft.idNeighborhood === null) errors.idNeighborhood = 'Elige el barrio.';
	return errors;
}

export function hasErrors(errors: NewClientErrors): boolean {
	return Object.keys(errors).length > 0;
}

// El campo opcional vacío se envía como null (no como texto en blanco)
export function toNewClientInput(draft: NewClientDraft): NewClientInput {
	return {
		name: draft.name.trim(),
		phone: draft.phone || null,
		address: draft.address.trim() || null,
		id_neighborhood: draft.idNeighborhood as number,
	};
}

// ----- Barrios -----
export function neighborhoodLabel(neighborhood: Pick<NeighborhoodDropdown, 'name' | 'zone_name'>): string {
	return `${neighborhood.name} · ${neighborhood.zone_name}`;
}

// Por barrio y luego zona, sin importar tildes ni mayúsculas
export function sortNeighborhoods(list: readonly NeighborhoodDropdown[]): NeighborhoodDropdown[] {
	return [...list].sort(
		(a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)) || normalizeText(a.zone_name).localeCompare(normalizeText(b.zone_name))
	);
}

// ----- Pedido -----
export interface OrderExtras {
	deliveryDate: string; // valor de <input type="date"> ("2026-10-29"); hoy si no se programa
	deliveryTime: string; // valor de <input type="time"> ("14:05") o ''
	driverId: number | null;
}

export function buildExistingClientOrder(idClient: number, lines: readonly EditorLine[], extras: OrderExtras): OrderCreateExistingClient {
	return {
		id_client: idClient,
		delivery_date: extras.deliveryDate || null,
		estimated_delivery: toApiTime(extras.deliveryTime),
		id_user_vehicle: extras.driverId,
		items: buildNewOrderItems(lines),
	};
}

export function buildNewClientOrder(client: NewClientDraft, lines: readonly EditorLine[], extras: OrderExtras): OrderCreateNewClient {
	return {
		client: toNewClientInput(client),
		delivery_date: extras.deliveryDate || null,
		estimated_delivery: toApiTime(extras.deliveryTime),
		id_user_vehicle: extras.driverId,
		items: buildNewOrderItems(lines),
	};
}
