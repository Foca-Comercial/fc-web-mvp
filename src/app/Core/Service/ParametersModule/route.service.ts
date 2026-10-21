import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Route, RouteClient, RouteCreate, RouteUpdate } from '@core/Models/ParametersModule/parameters.model';
import { GenericService } from '../generic.service';

// CRUD de rutas (/routes). Los demás endpoints de la vista de Rutas (/cards,
// /{id}/available-clients) se agregan cuando se construya su gestión.
@Injectable({ providedIn: 'root' })
export class RouteService extends GenericService<Route, RouteCreate, RouteUpdate> {
	constructor() {
		super(API_ENDPOINTS.routes);
	}

	// Clientes asignados a la ruta, con barrio, zona y estado del cliente
	getClients(id: number): Observable<RouteClient[]> {
		return this.http.get<RouteClient[]>(`${this.baseUrl}/${id}/clients`);
	}
}
