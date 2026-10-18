import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { ShiftClosure } from '@core/Models/CoreModule/closure.model';
import { ReadOnlyService } from '../generic.service';

// Cierres exportados (/shifts_closures): GET / y GET /{id} son de solo lectura.
// El resumen del día (/summary) y la exportación a Siigo (/{fecha}/export) se
// agregan al construir la vista Cierre.
@Injectable({ providedIn: 'root' })
export class ShiftClosureService extends ReadOnlyService<ShiftClosure> {
	constructor() {
		super(API_ENDPOINTS.shiftClosures);
	}
}
