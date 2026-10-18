// ==================================================
// Modelos: autenticación
// ==================================================
// Espejo de app/schemas/auth/auth_schema.py y del payload del access token
// (app/core/security.py → create_access_token).

// POST /auth/login y POST /auth/refresh
export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
}

// Body de /auth/refresh y /auth/logout
export interface RefreshRequest {
	refresh_token: string;
}

// Payload del JWT: sub = id_user (texto), exp en segundos epoch
export interface AccessTokenPayload {
	sub: string;
	exp: number;
	roles?: string[];
}

// Sesión en memoria del frontend
export interface SessionUser {
	userId: number;
	username: string;
	roles: string[];
	expiresAt: number; // milisegundos epoch
}

export interface LoginCredentials {
	username: string;
	password: string;
}
