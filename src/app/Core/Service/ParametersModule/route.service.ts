import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Route, RouteCard, RouteClient, RouteCreate, RouteUpdate } from '@core/Models/ParametersModule/parameters.model';
import { toHttpParams } from '@core/Utils/http-params.utils';
import { GenericService } from '../generic.service';

// CRUD de rutas (/routes) y lo que lee la vista de Rutas: cards y clientes de cada ruta.
// Crear, editar y eliminar rutas es del panel de administración.
@Injectable({ providedIn: 'root' })
export class RouteService extends GenericService<Route, RouteCreate, RouteUpdate> {
	constructor() {
		super(API_ENDPOINTS.routes);
	}

	// Todas las rutas con su N.° de clientes activos (incluye inactivas salvo onlyActive)
	getCards(onlyActive = false): Observable<RouteCard[]> {
		return this.http.get<RouteCard[]>(`${this.baseUrl}/cards`, { params: toHttpParams({ only_active: onlyActive }) });
	}

	// Clientes asignados a la ruta, con barrio, zona y estado del cliente
	getClients(id: number): Observable<RouteClient[]> {
		return this.http.get<RouteClient[]>(`${this.baseUrl}/${id}/clients`);
	}
}
