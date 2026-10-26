// ==================================================
// Texto
// ==================================================

// Minúsculas y sin tildes: "Peña" coincide con "pena". Base de todos los buscadores.
export function normalizeText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}
