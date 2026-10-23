// ==================================================
// Formulario de ruta (crear / editar): días de salida
// ==================================================
// Funciones puras del modal "Nueva ruta" / "Editar ruta".

import { DayWeek } from '@core/Models/Shared/api-types.model';

export const ALL_DAYS: readonly DayWeek[] = [
	DayWeek.MONDAY,
	DayWeek.TUESDAY,
	DayWeek.WEDNESDAY,
	DayWeek.THURSDAY,
	DayWeek.FRIDAY,
	DayWeek.SATURDAY,
	DayWeek.SUNDAY,
];

// Atajos de días de la ruta
export const DAY_PRESETS: readonly { label: string; days: readonly number[] }[] = [
	{ label: 'Lun a Vie', days: [1, 2, 3, 4, 5] },
	{ label: 'Lun a Sáb', days: [1, 2, 3, 4, 5, 6] },
	{ label: 'Todos', days: [1, 2, 3, 4, 5, 6, 7] },
];

// Marca o desmarca un día; el resultado queda ordenado y sin repetidos (igual que la API)
export function toggleDay(days: readonly number[], day: number): number[] {
	const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
	return [...new Set(next)].sort((a, b) => a - b);
}

export function sameDays(a: readonly number[], b: readonly number[]): boolean {
	const x = [...a].sort((m, n) => m - n);
	const y = [...b].sort((m, n) => m - n);
	return x.length === y.length && x.every((day, index) => day === y[index]);
}
