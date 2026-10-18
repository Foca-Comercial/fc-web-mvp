// ==================================================
// Claves de almacenamiento local
// ==================================================
// Prefijo "fc." para no chocar con otras apps servidas en el mismo origen.

export const STORAGE_KEYS = {
	// PROVISIONAL: el backend devuelve el refresh token en el body. Cuando migre a
	// cookie httpOnly (pendiente en el README de la API), esta clave desaparece.
	REFRESH_TOKEN: 'fc.refresh_token',
	USERNAME: 'fc.username',
} as const;
