// ==================================================
// Entorno de producción
// ==================================================
// Reemplaza a environment.ts en `ng build` (ver fileReplacements en angular.json).
// TODO: definir la URL pública de la API cuando exista el despliegue. Si el frontend
// y la API quedan en dominios distintos, el backend debe configurar CORS.

export const environment = {
	production: true,
	apiUrl: '/api/v1',
};
