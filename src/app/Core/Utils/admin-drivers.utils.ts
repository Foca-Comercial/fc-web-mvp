// ==================================================
// Panel de administración · Domiciliarios y asignaciones (lógica pura)
// ==================================================
// Un domiciliario es persona + usuario + rol VENDEDOR. Cada asignación es la pareja
// domiciliario + vehículo con su código de 2 dígitos (el vendedor en Siigo): un
// domiciliario tiene un código por cada vehículo que maneja.

import {
	DriverAdminFilters,
	DriverAdminRow,
	DriverAssignment,
	DriverCreate,
	DriverUpdate,
} from '@core/Models/CoreModule/driver.model';
import { Vehicle } from '@core/Models/ParametersModule/parameters.model';
import { normalizeText } from './text.utils';

export const MAX_DRIVER_NAME_LENGTH = 100;
export const DRIVER_PHONE_DIGITS = 10;
export const SELLER_CODE_DIGITS = 2;

// ----- Filtros -----
export const DEFAULT_DRIVER_FILTERS: DriverAdminFilters = { search: '', active: true };

export function hasCustomDriverFilters(filters: DriverAdminFilters): boolean {
	return filters.search !== DEFAULT_DRIVER_FILTERS.search || filters.active !== DEFAULT_DRIVER_FILTERS.active;
}

// ----- Formulario del domiciliario -----
export interface DriverDraft {
	name: string;
	lastName: string;
	phone: string; // solo dígitos
	email: string;
}

export const EMPTY_DRIVER: DriverDraft = { name: '', lastName: '', phone: '', email: '' };

export type DriverErrors = Partial<Record<keyof DriverDraft, string>>;

// Validación básica; la API valida el correo con más rigor (EmailStr)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function draftFromDriver(driver: DriverAdminRow | null): DriverDraft {
	if (!driver) return { ...EMPTY_DRIVER };
	return { name: driver.name, lastName: driver.last_name, phone: driver.phone ?? '', email: driver.email ?? '' };
}

export function driverErrors(draft: DriverDraft): DriverErrors {
	const errors: DriverErrors = {};
	const required = (value: string, label: string): string | undefined => {
		const text = value.trim();
		if (!text) return `Escribe el ${label}.`;
		if (text.length > MAX_DRIVER_NAME_LENGTH) return `Máximo ${MAX_DRIVER_NAME_LENGTH} caracteres.`;
		return undefined;
	};
	const name = required(draft.name, 'nombre');
	if (name) errors.name = name;
	const lastName = required(draft.lastName, 'apellido');
	if (lastName) errors.lastName = lastName;
	if (draft.phone && draft.phone.length !== DRIVER_PHONE_DIGITS) {
		errors.phone = `El teléfono debe tener ${DRIVER_PHONE_DIGITS} dígitos.`;
	}
	if (draft.email.trim() && !EMAIL.test(draft.email.trim())) errors.email = 'Escribe un correo válido.';
	return errors;
}

export function hasDriverErrors(errors: DriverErrors): boolean {
	return Object.keys(errors).length > 0;
}

// Los opcionales vacíos se envían como null
export function toDriverCreate(draft: DriverDraft): DriverCreate {
	return {
		name: draft.name.trim(),
		last_name: draft.lastName.trim(),
		phone: draft.phone || null,
		email: draft.email.trim() || null,
	};
}

// Solo lo que cambió (PATCH parcial). Nombre y apellido se guardan en mayúsculas.
export function driverChanges(driver: DriverAdminRow, draft: DriverDraft): DriverUpdate {
	const next = toDriverCreate(draft);
	const changes: DriverUpdate = {};
	if (next.name.toUpperCase() !== driver.name) changes.name = next.name;
	if (next.last_name.toUpperCase() !== driver.last_name) changes.last_name = next.last_name;
	if ((next.phone ?? null) !== driver.phone) changes.phone = next.phone ?? null;
	if ((next.email ?? null) !== driver.email) changes.email = next.email ?? null;
	return changes;
}

export function hasDriverChanges(changes: DriverUpdate): boolean {
	return Object.keys(changes).length > 0;
}

export function driverFullName(driver: Pick<DriverAdminRow, 'name' | 'last_name'>): string {
	return `${driver.name} ${driver.last_name}`;
}

// ----- Asignaciones -----
export function isSellerCode(code: string): boolean {
	return new RegExp(`^\\d{${SELLER_CODE_DIGITS}}$`).test(code);
}

// Ordenadas por código
export function upsertAssignment(rows: readonly DriverAssignment[], row: DriverAssignment): DriverAssignment[] {
	return [...rows.filter((r) => r.id_user_vehicle !== row.id_user_vehicle), row].sort((a, b) => a.code.localeCompare(b.code));
}

export function removeAssignment(rows: readonly DriverAssignment[], idUserVehicle: number): DriverAssignment[] {
	return rows.filter((row) => row.id_user_vehicle !== idUserVehicle);
}

// Vehículos activos que el domiciliario aún no tiene (una asignación por pareja). Con
// `keep`, se conserva ese vehículo (el de la asignación que se está editando).
export function availableVehicles(vehicles: readonly Vehicle[], rows: readonly DriverAssignment[], keep?: number): Vehicle[] {
	const taken = new Set(rows.map((row) => row.id_vehicle));
	return vehicles
		.filter((vehicle) => vehicle.active && (vehicle.id_vehicle === keep || !taken.has(vehicle.id_vehicle)))
		.sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)));
}

// ¿Se puede cambiar código / vehículo o borrar? Solo si nunca se usó y no es la del
// vendedor por defecto (la API lo valida igual)
export function isEditableAssignment(row: DriverAssignment): boolean {
	return !row.in_use && !row.is_default;
}

// "28, 45, 51" o "Sin asignaciones"
export function codesText(codes: readonly string[]): string {
	return codes.length > 0 ? codes.join(', ') : 'Sin asignaciones';
}
