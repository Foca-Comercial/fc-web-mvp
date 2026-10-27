import { HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { ShiftClosure, ShiftClosureSummary } from '@core/Models/CoreModule/closure.model';
import { IsoDate } from '@core/Models/Shared/api-types.model';
import { ReadOnlyService } from '../generic.service';

// Cierres exportados (/shifts_closures): GET / y GET /{id} son de solo lectura (ADMINISTRADOR).
// La vista Cierre usa el resumen del día y la exportación a Siigo (GESTOR_COMERCIAL).
@Injectable({ providedIn: 'root' })
export class ShiftClosureService extends ReadOnlyService<ShiftClosure> {
	constructor() {
		super(API_ENDPOINTS.shiftClosures);
	}

	// Cards del día y una fila por vendedor con lo facturable. Sin `date` es hoy en Bogotá;
	// una fecha futura se rechaza (INVALID_CLOSURE_DATE).
	getSummary(date?: IsoDate): Observable<ShiftClosureSummary> {
		const params = date ? new HttpParams().set('target_date', date) : new HttpParams();
		return this.http.get<ShiftClosureSummary>(`${this.baseUrl}/summary`, { params });
	}

	// Cierra el día: genera el .xlsx para Siigo y marca los cierres como exportados. Se puede
	// repetir (reexportar). Devuelve la respuesta completa para leer el nombre del archivo.
	exportDay(date: IsoDate): Observable<HttpResponse<Blob>> {
		return this.http.post(`${this.baseUrl}/${date}/export`, null, { observe: 'response', responseType: 'blob' });
	}
}
