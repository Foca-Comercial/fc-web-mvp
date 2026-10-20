// ==================================================
// Claves de almacenamiento local
// ==================================================
// Prefijo "fc." para no chocar con otras apps servidas en el mismo origen.

export const STORAGE_KEYS = {
	USERNAME: 'fc.username',
	// Preferencia del menú lateral en escritorio: 'open' | 'closed'
	SIDEBAR: 'fc.sidebar',
} as const;
