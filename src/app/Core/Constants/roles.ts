// ==================================================
// Roles del sistema
// ==================================================
// Mismos nombres que la tabla `role` del backend y el claim `roles` del JWT.
// ADMINISTRADOR hace bypass total (igual que require_roles en la API).

export const ROLES = {
	ADMIN: 'ADMINISTRADOR',
	COMMERCIAL_MANAGER: 'GESTOR_COMERCIAL',
	SELLER: 'VENDEDOR',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
