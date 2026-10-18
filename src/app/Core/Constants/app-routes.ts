// ==================================================
// Rutas del frontend
// ==================================================
// Un solo lugar para los paths: el ruteo, el menú y las redirecciones los leen de aquí.

export const APP_ROUTES = {
	LOGIN: '/login',
	ACCESS_DENIED: '/acceso-denegado',

	ORDERS: '/pedidos',
	ROUTES: '/rutas',
	HISTORY: '/historico',
	CLOSURE: '/cierre',
	ADMIN: '/administracion',
} as const;
