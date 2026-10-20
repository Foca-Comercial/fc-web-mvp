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

// Nombre para mostrar en pantalla (los valores de ROLES son los del backend)
export const ROLE_LABELS: Record<string, string> = {
	[ROLES.ADMIN]: 'Administrador',
	[ROLES.COMMERCIAL_MANAGER]: 'Gestor comercial',
	[ROLES.SELLER]: 'Vendedor',
};

export function roleLabel(role: string): string {
	return ROLE_LABELS[role] ?? role;
}
