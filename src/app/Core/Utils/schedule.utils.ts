// ==================================================
// Pedidos programados: día de entrega (lógica pura)
// ==================================================
// Cada pedido tiene un día de entrega (`delivery_date`, "AAAA-MM-DD", calendario de Bogotá).
// Normalmente es hoy; un pedido programado lo trae en el futuro y solo aparece en el tablero
// ese día. Espejo de lo que valida la API (MAX_SCHEDULE_DAYS): hoy o posterior, hasta 60 días.
// El backend sigue siendo quien decide; esto evita pedir fechas que fallarían.

import { IsoDate } from '@core/Models/Shared/api-types.model';

// Cuántos días hacia adelante se puede programar un pedido
export const MAX_SCHEDULE_DAYS = 60;

// "AAAA-MM-DD" + n días → "AAAA-MM-DD". Aritmética en UTC: no depende de la zona del navegador.
export function addDaysIso(day: IsoDate, days: number): IsoDate {
	const [year, month, date] = day.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

// Último día en que se puede programar un pedido
export function maxScheduleDate(today: IsoDate): IsoDate {
	return addDaysIso(today, MAX_SCHEDULE_DAYS);
}

// ¿El pedido es de un día posterior a hoy? (aún no se puede despachar)
export function isScheduled(deliveryDate: IsoDate | null | undefined, today: IsoDate): boolean {
	return !!deliveryDate && deliveryDate > today;
}

// Texto de error del campo "Fecha de entrega" (null = válida). Las fechas ISO se comparan como texto.
export function scheduleError(day: string, today: IsoDate): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'Elige el día de entrega.';
	if (day < today) return 'El día de entrega no puede ser anterior a hoy.';
	if (day > maxScheduleDate(today)) return `Solo se pueden programar pedidos hasta ${MAX_SCHEDULE_DAYS} días adelante.`;
	return null;
}
