// ==================================================
// Pipe: apiTime
// ==================================================
// Hora que manda la API ("14:05:00") en formato de 12 horas.
//   {{ route.departure_time | apiTime }} → 2:05 p. m.

import { Pipe, PipeTransform } from '@angular/core';
import { formatApiTime } from '@core/Utils/date.utils';

@Pipe({ name: 'apiTime' })
export class ApiTimePipe implements PipeTransform {
	transform(value: string | null | undefined): string {
		return formatApiTime(value);
	}
}
