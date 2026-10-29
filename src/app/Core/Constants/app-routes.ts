// ==================================================
// Rutas del frontend
// ==================================================
// Un solo lugar para los paths: el ruteo, el menú y las redirecciones los leen de aquí.

// Subsecciones del panel de administración (solo ADMINISTRADOR), relativas a /administracion.
// admin.routes.ts declara sus rutas con estos segmentos y APP_ROUTES arma la URL completa.
export const ADMIN_PATHS = {
	CLIENTS: 'clientes',
	PRODUCTS: 'productos',
	DRIVERS: 'domiciliarios',
	VEHICLES: 'vehiculos',
	ROUTES: 'rutas',
	ARCHIVE: 'archivo',
} as const;

const ADMIN = '/administracion';

export const APP_ROUTES = {
	LOGIN: '/login',
	ACCESS_DENIED: '/acceso-denegado',

	ORDERS: '/pedidos',
	ROUTES: '/rutas',
	HISTORY: '/historico',
	CLOSURE: '/cierre',

	// Panel de administración
	ADMIN,
	ADMIN_CLIENTS: `${ADMIN}/${ADMIN_PATHS.CLIENTS}`,
	ADMIN_PRODUCTS: `${ADMIN}/${ADMIN_PATHS.PRODUCTS}`,
	ADMIN_DRIVERS: `${ADMIN}/${ADMIN_PATHS.DRIVERS}`,
	ADMIN_VEHICLES: `${ADMIN}/${ADMIN_PATHS.VEHICLES}`,
	ADMIN_ROUTES: `${ADMIN}/${ADMIN_PATHS.ROUTES}`,
	ADMIN_ARCHIVE: `${ADMIN}/${ADMIN_PATHS.ARCHIVE}`,
} as const;
