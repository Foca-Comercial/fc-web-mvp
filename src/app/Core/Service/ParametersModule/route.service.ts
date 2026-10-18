import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Route, RouteCreate, RouteUpdate } from '@core/Models/ParametersModule/parameters.model';
import { GenericService } from '../generic.service';

// CRUD de rutas (/routes). Los endpoints de la vista de Rutas (/cards,
// /{id}/clients, /{id}/available-clients) se agregan al construir esa vista.
@Injectable({ providedIn: 'root' })
export class RouteService extends GenericService<Route, RouteCreate, RouteUpdate> {
	constructor() {
		super(API_ENDPOINTS.routes);
	}
}
