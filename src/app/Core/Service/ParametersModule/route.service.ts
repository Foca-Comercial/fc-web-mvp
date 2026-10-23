import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	Route,
	RouteAvailableClient,
	RouteCard,
	RouteClient,
	RouteClientAssign,
	RouteCreate,
	RouteUpdate,
} from '@core/Models/ParametersModule/parameters.model';
import { toHttpParams } from '@core/Utils/http-params.utils';
import { GenericService } from '../generic.service';

// CRUD de rutas (/routes) y los endpoints de la vista de Rutas: cards y clientes de la
// ruta (asignar / quitar).
@Injectable({ providedIn: 'root' })
export class RouteService extends GenericService<Route, RouteCreate, RouteUpdate> {
	constructor() {
		super(API_ENDPOINTS.routes);
	}

	// Todas las rutas con su N.° de clientes activos (incluye inactivas salvo onlyActive)
	getCards(onlyActive = false): Observable<RouteCard[]> {
		return this.http.get<RouteCard[]>(`${this.baseUrl}/cards`, { params: toHttpParams({ only_active: onlyActive }) });
	}

	// ----- Clientes de la ruta -----
	// Asignados, con barrio, zona y estado del cliente
	getClients(id: number): Observable<RouteClient[]> {
		return this.http.get<RouteClient[]>(`${this.baseUrl}/${id}/clients`);
	}

	// Selector para asignar: registrados, activos y aún no en la ruta. `name` desde 2 letras;
	// sin `name` trae los primeros `limit` en orden alfabético.
	getAvailableClients(id: number, name?: string | null, limit = 20): Observable<RouteAvailableClient[]> {
		return this.http.get<RouteAvailableClient[]>(`${this.baseUrl}/${id}/available-clients`, {
			params: toHttpParams({ name, limit }),
		});
	}

	assignClient(id: number, idClient: number): Observable<RouteClient> {
		const body: RouteClientAssign = { id_client: idClient };
		return this.http.post<RouteClient>(`${this.baseUrl}/${id}/clients`, body);
	}

	unassignClient(id: number, idClient: number): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}/clients/${idClient}`);
	}
}
