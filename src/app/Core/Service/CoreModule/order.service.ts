import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	Order,
	OrderCreateExistingClient,
	OrderCreateNewClient,
	OrderFullDetail,
	OrderItemsSyncRequest,
	OrderSummary,
	OrderUpdate,
	OrderWithDetails,
	RouteOfDay,
	RouteOrdersCreate,
	RouteOrdersCreated,
	RouteOrderTemplate,
} from '@core/Models/CoreModule/order.model';
import { IsoDate } from '@core/Models/Shared/api-types.model';
import { ReadOnlyService } from '../generic.service';

// Pedidos (/orders). No usa el CRUD genérico: no existe POST /orders/ ni DELETE.
// Los demás flujos (new-client, existing-client, items-order, history…) se agregan
// al construir cada vista.
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

	// ----- Registro de pedidos -----
	// El consecutivo (purchase_order) lo asigna la API. Solo acepta clientes REGISTRADOS.
	createForExistingClient(body: OrderCreateExistingClient): Observable<OrderWithDetails> {
		return this.http.post<OrderWithDetails>(`${this.baseUrl}/existing-client`, body);
	}

	// Crea también al cliente, como temporal (is_registered = false)
	createForNewClient(body: OrderCreateNewClient): Observable<OrderWithDetails> {
		return this.http.post<OrderWithDetails>(`${this.baseUrl}/new-client`, body);
	}

	// ----- Acciones sobre un pedido -----

	// PENDING → DISPATCHED. No exige domiciliario: se puede despachar sin asignar
	dispatch(id: number): Observable<Order> {
		return this.http.post<Order>(`${this.baseUrl}/${id}/dispatch`, null);
	}

	// DISPATCHED → DELIVERED
	deliver(id: number): Observable<Order> {
		return this.http.post<Order>(`${this.baseUrl}/${id}/deliver`, null);
	}

	// Asigna o cambia el domiciliario (mientras el pedido no sea final) o la hora estimada (solo PENDING)
	updateOrder(id: number, body: OrderUpdate): Observable<Order> {
		return this.http.patch<Order>(`${this.baseUrl}/${id}`, body);
	}

	// Reemplaza la lista de productos del pedido por la enviada (solo PENDING). Los renglones sin
	// `id_order_detail` se crean y los que no vengan se eliminan; la API recalcula el total.
	syncItems(id: number, body: OrderItemsSyncRequest): Observable<Order> {
		return this.http.put<Order>(`${this.baseUrl}/${id}/items-order`, body);
	}

	// Comprobante de despacho (CD) en PDF. Solo existe para pedidos despachados o entregados
	getReceipt(id: number): Observable<Blob> {
		return this.http.get(`${this.baseUrl}/${id}/receipt`, { responseType: 'blob' });
	}

	// ----- Pedidos por ruta -----
	// Rutas activas que salen ese día (sin `date` es "hoy" en Bogotá), con cuántos
	// pedidos ya se generaron desde cada una
	getRoutesOfDay(date?: IsoDate): Observable<RouteOfDay[]> {
		return this.http.get<RouteOfDay[]>(`${this.baseUrl}/routes-of-day`, { params: this.dateParams(date) });
	}

	// Precarga del formulario: catálogo, precio que aplica a cada cliente y si ya tiene pedido de hoy
	getRouteTemplate(id: number): Observable<RouteOrderTemplate> {
		return this.http.get<RouteOrderTemplate>(`${this.baseUrl}/routes/${id}/template`);
	}

	// Crea en una sola transacción los pedidos de los clientes que traen productos (todo o nada)
	createRouteOrders(id: number, body: RouteOrdersCreate): Observable<RouteOrdersCreated> {
		return this.http.post<RouteOrdersCreated>(`${this.baseUrl}/routes/${id}`, body);
	}

	private dateParams(date?: IsoDate): HttpParams {
		return date ? new HttpParams().set('target_date', date) : new HttpParams();
	}
}
