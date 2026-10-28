// ==================================================
// Utilidades de fecha y hora (zona America/Bogota)
// ==================================================
// Igual que en el backend (app/core/timezone.py): nunca `new Date().toISOString()`
// para "hoy", porque está en UTC y después de las 7 p. m. de Bogotá ya es mañana.

export const BOGOTA_TZ = 'America/Bogota';

// Fecha de hoy en Bogotá como "AAAA-MM-DD" (formato que esperan los query params)
export function todayBogota(): string {
	return toIsoDateBogota(new Date());
}

// Cualquier instante → "AAAA-MM-DD" según el calendario de Bogotá
export function toIsoDateBogota(date: Date): string {
	// en-CA formatea como AAAA-MM-DD
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: BOGOTA_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);
}

// Día de la semana de hoy en Bogotá: 1 = lunes ... 7 = domingo (como DayWeek de la API)
export function isoWeekdayBogota(date: Date = new Date()): number {
	return parseIsoDate(toIsoDateBogota(date)).getDay() || 7;
}

// "AAAA-MM-DD" → Date local a medianoche (para mostrarla sin corrimiento de día)
export function parseIsoDate(value: string): Date {
	const [year, month, day] = value.split('-').map(Number);
	return new Date(year, month - 1, day);
}

// "2026-10-29" → "jueves, 29 de octubre de 2026" (calendario, sin zona horaria)
export function formatIsoDateLong(value: string): string {
	return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseIsoDate(value));
}

// Hora de la API ("14:05:00" o "14:05") → "2:05 p. m."
export function formatApiTime(value: string | null | undefined): string {
	if (!value) return '';
	const [hours, minutes] = value.split(':').map(Number);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
	const date = new Date(2000, 0, 1, hours, minutes);
	return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

// Valor de un <input type="time"> ("14:05") → formato que acepta la API ("14:05:00")
export function toApiTime(value: string | null | undefined): string | null {
	if (!value) return null;
	return value.length === 5 ? `${value}:00` : value;
}
