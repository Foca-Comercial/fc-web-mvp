// ==================================================
// Endpoints de la API (FastAPI, prefijo /api/v1)
// ==================================================
// Prefijos tal como los declara cada router del backend (ojo: varios van en plural
// con guion bajo, p. ej. /users_roles, /orders_details, /shifts_closures).

import { environment } from '@env/environment';

const API = environment.apiUrl;

export const API_ENDPOINTS = {
	// Auth
	auth: {
		login: `${API}/auth/login`,
		refresh: `${API}/auth/refresh`,
		logout: `${API}/auth/logout`,
		logoutAll: `${API}/auth/logout-all`,
	},

	// SecurityModule
	persons: `${API}/persons`,
	users: `${API}/users`,
	roles: `${API}/roles`,
	usersRoles: `${API}/users_roles`,

	// ParametersModule
	zones: `${API}/zones`,
	neighborhoods: `${API}/neighborhoods`,
	routes: `${API}/routes`,
	vehicles: `${API}/vehicles`,

	// CoreModule
	clients: `${API}/clients`,
	products: `${API}/products`,
	specialCustomerPrices: `${API}/specials_customers_prices`,
	orders: `${API}/orders`,
	orderDetails: `${API}/orders_details`,
	usersVehicles: `${API}/users_vehicles`,
	shiftClosures: `${API}/shifts_closures`,
	clientRoutes: `${API}/client_routes`,
	archive: `${API}/archive`,
} as const;

// Endpoints de auth que nunca llevan Bearer ni disparan el refresh automático
export const PUBLIC_AUTH_ENDPOINTS: readonly string[] = [
	API_ENDPOINTS.auth.login,
	API_ENDPOINTS.auth.refresh,
	API_ENDPOINTS.auth.logout,
];
