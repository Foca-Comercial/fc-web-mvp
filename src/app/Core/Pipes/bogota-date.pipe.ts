// ==================================================
// Pipe: bogotaDate
// ==================================================
// Muestra un instante (p. ej. `creation_datetime`) en hora de Bogotá, sin importar
// la zona horaria del navegador.
//   {{ order.creation_datetime | bogotaDate }}                → 17/10/2026, 14:05
//   {{ order.creation_datetime | bogotaDate: { dateStyle: 'long' } }}

import { Pipe, PipeTransform } from '@angular/core';
import { BOGOTA_TZ, parseIsoDate } from '@core/Utils/date.utils';

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
};

@Pipe({ name: 'bogotaDate' })
export class BogotaDatePipe implements PipeTransform {
	transform(value: Date | string | number | null | undefined, options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS): string {
		if (value === null || value === undefined || value === '') return '';

		// Una fecha pura "AAAA-MM-DD" no es un instante: se muestra tal cual, sin zona
		if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
			return new Intl.DateTimeFormat('es-CO', options).format(parseIsoDate(value));
		}

		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('es-CO', { timeZone: BOGOTA_TZ, ...options }).format(date);
	}
}
