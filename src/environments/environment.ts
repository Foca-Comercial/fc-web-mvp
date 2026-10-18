// ==================================================
// Entorno de desarrollo (por defecto)
// ==================================================
// La API se consume por ruta relativa: `ng serve` la redirige a FastAPI
// (http://localhost:8000) con proxy.conf.json, así no hace falta CORS en desarrollo.

export const environment = {
	production: false,
	apiUrl: '/api/v1',
};
