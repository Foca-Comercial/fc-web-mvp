// ==================================================
// Tipos y enums compartidos con la API
// ==================================================
// Espejo de app/utils/enums del backend y de cómo FastAPI serializa los tipos:
//   Decimal  → texto  "12500.00"
//   date     → texto  "2026-10-17"
//   time     → texto  "14:05:00"
//   datetime → texto  ISO 8601 con zona "2026-10-17T19:05:00.123-05:00"

export type Money = string;
export type MoneyInput = number | string;
export type IsoDate = string;
export type IsoDateTime = string;
export type TimeString = string;

// ----- Enums (mismos valores que el backend) -----
export enum OrderState {
	PENDING = 'PENDING',
	DISPATCHED = 'DISPATCHED',
	DELIVERED = 'DELIVERED',
	CANCELLED = 'CANCELLED',
}

export const ORDER_STATE_LABELS: Record<OrderState, string> = {
	[OrderState.PENDING]: 'Pendiente',
	[OrderState.DISPATCHED]: 'Despachado',
	[OrderState.DELIVERED]: 'Entregado',
	[OrderState.CANCELLED]: 'Cancelado',
};

export enum DayWeek {
	MONDAY = 1,
	TUESDAY = 2,
	WEDNESDAY = 3,
	THURSDAY = 4,
	FRIDAY = 5,
	SATURDAY = 6,
	SUNDAY = 7,
}

export const DAY_WEEK_LABELS: Record<DayWeek, { short: string; long: string }> = {
	[DayWeek.MONDAY]: { short: 'Lun', long: 'Lunes' },
	[DayWeek.TUESDAY]: { short: 'Mar', long: 'Martes' },
	[DayWeek.WEDNESDAY]: { short: 'Mié', long: 'Miércoles' },
	[DayWeek.THURSDAY]: { short: 'Jue', long: 'Jueves' },
	[DayWeek.FRIDAY]: { short: 'Vie', long: 'Viernes' },
	[DayWeek.SATURDAY]: { short: 'Sáb', long: 'Sábado' },
	[DayWeek.SUNDAY]: { short: 'Dom', long: 'Domingo' },
};

export enum DeletionType {
	SOFT = 'SOFT',
	HARD = 'HARD',
}

export enum ArchiveStatus {
	EXPORTED = 'EXPORTED',
	PURGED = 'PURGED',
}

// Paginación de la API (skip/limit en los GET genéricos)
export interface ListQuery {
	skip?: number;
	limit?: number;
}
