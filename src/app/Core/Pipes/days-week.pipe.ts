// ==================================================
// Pipe: daysWeek
// ==================================================
// Lista de días de una ruta (1 = lunes ... 7 = domingo) en texto.
//   {{ route.days_week | daysWeek }}          → Lun, Mié, Vie
//   {{ route.days_week | daysWeek: 'long' }}  → Lunes, Miércoles, Viernes

import { Pipe, PipeTransform } from '@angular/core';
import { DAY_WEEK_LABELS, DayWeek } from '@core/Models/Shared/api-types.model';

@Pipe({ name: 'daysWeek' })
export class DaysWeekPipe implements PipeTransform {
	transform(days: readonly number[] | null | undefined, format: 'short' | 'long' = 'short'): string {
		if (!days?.length) return '';
		return days.map((day) => DAY_WEEK_LABELS[day as DayWeek]?.[format] ?? String(day)).join(', ');
	}
}
