import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Order } from '@core/Models/CoreModule/order.model';
import { ReadOnlyService } from '../generic.service';

// Pedidos (/orders). No usa el CRUD genérico: no existe POST /orders/ ni DELETE.
// Los flujos (new-client, existing-client, dispatch, deliver, items-order,
// dashboard-summary, history, rutas…) se agregan al construir cada vista.
@Injectable({ providedIn: 'root' })
export class OrderService extends ReadOnlyService<Order> {
	constructor() {
		super(API_ENDPOINTS.orders);
	}
}
