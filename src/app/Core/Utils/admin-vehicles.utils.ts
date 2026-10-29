// ==================================================
// Panel de administración · Vehículos (lógica pura)
// ==================================================
// Un vehículo lo comparten varios domiciliarios: cada pareja es una asignación con su
// código. Desactivar un vehículo oculta todas sus asignaciones del selector del pedido.

import { VehicleAdminFilters, VehicleAdminRow } from '@core/Models/ParametersModule/parameters.model';

export const MAX_VEHICLE_NAME_LENGTH = 50;

// ----- Filtros -----
export const DEFAULT_VEHICLE_FILTERS: VehicleAdminFilters = { search: '', active: true };

export function hasCustomVehicleFilters(filters: VehicleAdminFilters): boolean {
	return filters.search !== DEFAULT_VEHICLE_FILTERS.search || filters.active !== DEFAULT_VEHICLE_FILTERS.active;
}

// ----- Formulario -----
// Error del nombre, o null si está bien
export function vehicleNameError(name: string): string | null {
	const text = name.trim();
	if (!text) return 'Escribe el nombre del vehículo.';
	if (text.length > MAX_VEHICLE_NAME_LENGTH) return `Máximo ${MAX_VEHICLE_NAME_LENGTH} caracteres.`;
	return null;
}

// ¿Cambió el nombre? Se guarda en mayúsculas
export function vehicleNameChanged(vehicle: VehicleAdminRow | null, name: string): boolean {
	return vehicle === null || name.trim().toUpperCase() !== vehicle.name;
}

// ----- Textos -----
// "3 asignaciones activas"
export function assignmentsText(count: number): string {
	if (count === 0) return 'Ninguna';
	return `${count} ${count === 1 ? 'asignación' : 'asignaciones'}`;
}
