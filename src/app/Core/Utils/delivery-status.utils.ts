// ==================================================
// Estado de entrega de un pedido (Pendiente / Próximo / Retrasado …)
// ==================================================
// El backend NO entrega "Próximo" ni "Retrasado": se calculan aquí a partir del estado
// del pedido y de `estimated_delivery` (hora "HH:MM:SS" de Bogotá). Reglas acordadas:
//   - PENDING con hora estimada:
//       faltan menos de 15 min → "Próximo"
//       la hora ya pasó        → "Retrasado"
//       en otro caso           → "Pendiente"
//   - PENDING sin hora estimada → "Pendiente"
//   - PENDING de un día anterior → "Retrasado"
//   - PENDING programado para un día posterior → "Programado" (sin Próximo ni Retrasado)
//   - DISPATCHED → "Despachado" · DELIVERED → "Entregado" · CANCELLED → "Cancelado"
//
// Es una función pura (recibe `now`) para poder probarla sin depender del reloj.

import { OrderState } from '@core/Models/Shared/api-types.model';
import { BOGOTA_TZ, toIsoDateBogota } from './date.utils';

export type DeliveryTone = 'pending' | 'soon' | 'late' | 'done' | 'cancelled';

export interface DeliveryStatus {
	tone: DeliveryTone;
	label: string;
	// Frase corta para el tooltip ("Faltan 12 min", "Retraso de 8 min"); null si no aplica
	detail: string | null;
}

// Umbral de "Próximo": menos de 15 minutos para la hora estimada
export const SOON_THRESHOLD_MINUTES = 15;

// Segundos transcurridos del día en Bogotá para un instante dado
export function secondsOfDayBogota(date: Date): number {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: BOGOTA_TZ,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(date);
	const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
	return get('hour') * 3600 + get('minute') * 60 + get('second');
}

// "HH:MM" o "HH:MM:SS" → segundos del día; null si no se puede leer
export function apiTimeToSeconds(value: string | null | undefined): number | null {
	if (!value) return null;
	const [hours, minutes, seconds = 0] = value.split(':').map(Number);
	if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
	return hours * 3600 + minutes * 60 + seconds;
}

// 45 → "45 min" · 60 → "1 h" · 135 → "2 h 15 min"
function minutesText(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * @param state              estado del pedido que manda la API
 * @param estimatedDelivery  `estimated_delivery` ("HH:MM:SS") o null
 * @param now                instante de referencia (por defecto, ahora)
 * @param orderDate          "AAAA-MM-DD" del día que se está viendo; si es anterior a
 *                           hoy y el pedido sigue pendiente, ya está retrasado; si es
 *                           posterior, el pedido está "Programado" (su hora aún no corre)
 */
export function computeDeliveryStatus(
	state: OrderState,
	estimatedDelivery: string | null | undefined,
	now: Date = new Date(),
	orderDate?: string | null
): DeliveryStatus {
	switch (state) {
		case OrderState.DISPATCHED:
			return { tone: 'done', label: 'Despachado', detail: null };
		case OrderState.DELIVERED:
			return { tone: 'done', label: 'Entregado', detail: null };
		case OrderState.CANCELLED:
			return { tone: 'cancelled', label: 'Cancelado', detail: null };
	}

	// PENDING
	if (orderDate && orderDate > toIsoDateBogota(now)) {
		return { tone: 'pending', label: 'Programado', detail: 'Pedido programado para otro día' };
	}
	if (orderDate && orderDate < toIsoDateBogota(now)) {
		return { tone: 'late', label: 'Retrasado', detail: 'Pedido de un día anterior sin despachar' };
	}

	const estimated = apiTimeToSeconds(estimatedDelivery);
	if (estimated === null) return { tone: 'pending', label: 'Pendiente', detail: null };

	const minutesLeft = Math.floor((estimated - secondsOfDayBogota(now)) / 60);
	if (estimated < secondsOfDayBogota(now)) {
		return { tone: 'late', label: 'Retrasado', detail: `Retraso de ${minutesText(Math.abs(minutesLeft))}` };
	}
	if (minutesLeft < SOON_THRESHOLD_MINUTES) {
		return { tone: 'soon', label: 'Próximo', detail: `Faltan ${minutesText(Math.max(minutesLeft, 0))}` };
	}
	return { tone: 'pending', label: 'Pendiente', detail: `Faltan ${minutesText(minutesLeft)}` };
}
