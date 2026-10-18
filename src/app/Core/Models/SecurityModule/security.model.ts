// ==================================================
// Modelos: SecurityModule (Person, User, Role, UserRole)
// ==================================================
// Espejo de app/schemas/securityModule. Convención en todo el frontend:
//   Xxx        → respuesta de la API (XxxResponse)
//   XxxCreate  → body del POST
//   XxxUpdate  → body del PATCH (todos los campos opcionales)

// ----- Person -----
export interface PersonCreate {
	name: string; // máx. 100, se guarda en MAYÚSCULAS
	last_name: string; // máx. 100
	phone?: string | null; // máx. 10
	email?: string | null; // máx. 50
	active?: boolean;
}
export type PersonUpdate = Partial<PersonCreate>;
export interface Person extends Required<PersonCreate> {
	id_person: number;
}

// ----- User -----
export interface UserCreate {
	username: string; // máx. 100, se guarda en minúsculas
	password: string; // 8 a 200 caracteres
	id_person: number;
	active?: boolean;
}
export type UserUpdate = Partial<Omit<UserCreate, 'password'>>;
export interface User {
	id_user: number;
	username: string;
	id_person: number;
	active: boolean;
}

// ----- Role -----
export interface RoleCreate {
	name: string; // máx. 100
	description?: string | null; // máx. 200
	active?: boolean;
}
export type RoleUpdate = Partial<RoleCreate>;
export interface Role extends Required<RoleCreate> {
	id_role: number;
}

// ----- UserRole -----
export interface UserRoleCreate {
	id_user: number;
	id_role: number;
}
export type UserRoleUpdate = Partial<UserRoleCreate>;
export interface UserRole extends UserRoleCreate {
	id_user_role: number;
}
