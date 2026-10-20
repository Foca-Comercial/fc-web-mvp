import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Order, OrderFullDetail, OrderSummary } from '@core/Models/CoreModule/order.model';
import { IsoDate } from '@core/Models/Shared/api-types.model';
import { ReadOnlyService } from '../generic.service';

// Pedidos (/orders). No usa el CRUD genérico: no existe POST /orders/ ni DELETE.
// Los demás flujos (new-client, existing-client, dispatch, deliver, items-order,
// history, rutas…) se agregan al construir cada vista.
@Injectable({ providedIn: 'root' })
export class OrderService extends ReadOnlyService<Order> {
	constructor() {
		super(API_ENDPOINTS.orders);
	}

	// ----- Tablero de despachos -----
	// Ambas listas devuelven el día completo (sin paginar) y sin `date` es "hoy" en Bogotá.

	// Pestaña "Pedidos pendientes": PENDING + CANCELLED
	getDashboardSummary(date?: IsoDate): Observable<OrderSummary[]> {
		return this.http.get<OrderSummary[]>(`${this.baseUrl}/dashboard-summary`, { params: this.dateParams(date) });
	}

	// Pestaña "Pedidos despachados": DISPATCHED + DELIVERED
	getDispatchedSummary(date?: IsoDate): Observable<OrderSummary[]> {
		return this.http.get<OrderSummary[]>(`${this.baseUrl}/dispatched-summary`, { params: this.dateParams(date) });
	}

	// Modal de detalle: cliente, domiciliario y productos del pedido
	getFullDetail(id: number): Observable<OrderFullDetail> {
		return this.http.get<OrderFullDetail>(`${this.baseUrl}/${id}/details`);
	}

	private dateParams(date?: IsoDate): HttpParams {
		return date ? new HttpParams().set('target_date', date) : new HttpParams();
	}
}
